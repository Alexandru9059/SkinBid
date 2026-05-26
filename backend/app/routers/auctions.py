from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


def _enum_val(v):
    return v.value if hasattr(v, 'value') else v


def _bid_stats(auction_id: int, db: Session):
    return db.query(
        func.count(models.Bid.id).label('count'),
        func.max(models.Bid.amount).label('max_amount'),
    ).filter(models.Bid.auction_id == auction_id).first()


def _auction_dict(auction: models.Auction, db: Session) -> dict:
    inv = auction.inventory_item
    it = inv.item_type
    stats = _bid_stats(auction.id, db)
    return {
        'id': auction.id,
        'shop_id': auction.shop_id,
        'shop_name': auction.shop.name,
        'item_type_id': it.id,
        'item_type_name': it.name,
        'game_name': it.category.game.name,
        'rarity': _enum_val(it.rarity),
        'exterior': _enum_val(inv.exterior) if inv.exterior else None,
        'float_val': str(inv.float_val) if inv.float_val is not None else None,
        'reserve_price': str(auction.reserve_price),
        'start_at': auction.start_at.isoformat(),
        'end_at': auction.end_at.isoformat(),
        'status': _enum_val(auction.status),
        'current_bid': str(stats.max_amount) if stats.max_amount else None,
        'bid_count': stats.count,
        'image_url': it.image_url,
    }


def _activate_scheduled(db: Session):
    db.query(models.Auction).filter(
        models.Auction.status == models.AuctionStatus.scheduled,
        models.Auction.start_at <= datetime.now(timezone.utc),
    ).update({'status': models.AuctionStatus.active}, synchronize_session=False)
    db.commit()


@router.get('')
def list_auctions(
    status: Optional[str] = 'active',
    game_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    _activate_scheduled(db)
    q = db.query(models.Auction)
    if status:
        q = q.filter(models.Auction.status == status)
    if game_id:
        q = (
            q.join(models.InventoryItem)
            .join(models.ItemType)
            .join(models.ItemCategory)
            .filter(models.ItemCategory.game_id == game_id)
        )
    auctions = q.order_by(desc(models.Auction.end_at)).all()
    return [_auction_dict(a, db) for a in auctions]


@router.get('/{auction_id}')
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(models.Auction).filter(models.Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(404, 'Auction not found')

    out = _auction_dict(auction, db)

    rows = (
        db.query(models.Bid, models.User.username)
        .join(models.User, models.Bid.user_id == models.User.id)
        .filter(models.Bid.auction_id == auction_id)
        .order_by(desc(models.Bid.amount))
        .all()
    )
    out['bids'] = [
        {
            'id': r.Bid.id,
            'user_id': r.Bid.user_id,
            'username': r.username,
            'amount': str(r.Bid.amount),
            'placed_at': r.Bid.placed_at.isoformat(),
            'is_winner': r.Bid.is_winner,
        }
        for r in rows
    ]

    if auction.transaction:
        tx = auction.transaction
        out['transaction'] = {
            'id': tx.id,
            'buyer_id': tx.buyer_id,
            'final_price': str(tx.final_price),
            'confirmed_at': tx.confirmed_at.isoformat(),
        }
    return out


@router.post('', status_code=201)
def create_auction(data: schemas.AuctionCreate, db: Session = Depends(get_db)):
    inv = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == data.inventory_item_id,
        models.InventoryItem.shop_id == data.shop_id,
        models.InventoryItem.status == models.InventoryStatus.available,
    ).first()
    if not inv:
        raise HTTPException(400, 'Inventory item not available or not owned by this shop')

    auction = models.Auction(
        inventory_item_id=data.inventory_item_id,
        shop_id=data.shop_id,
        reserve_price=data.reserve_price,
        start_at=data.start_at,
        end_at=data.end_at,
        status=models.AuctionStatus.active,
    )
    inv.status = models.InventoryStatus.in_auction
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return _auction_dict(auction, db)


@router.post('/{auction_id}/bids', status_code=201)
def place_bid(auction_id: int, data: schemas.BidCreate, db: Session = Depends(get_db)):
    auction = db.query(models.Auction).filter(models.Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(404, 'Auction not found')
    if _enum_val(auction.status) != 'active':
        raise HTTPException(400, 'Auction is not active')

    if data.amount < float(auction.reserve_price):
        raise HTTPException(400, f'Bid must be at least the reserve price (${auction.reserve_price})')

    current_high = db.query(func.max(models.Bid.amount)).filter(
        models.Bid.auction_id == auction_id
    ).scalar()
    if current_high is not None and data.amount <= float(current_high):
        raise HTTPException(400, f'Bid must exceed current highest bid (${current_high})')

    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(404, 'User not found')

    bid = models.Bid(auction_id=auction_id, user_id=data.user_id, amount=data.amount)
    db.add(bid)
    db.commit()
    db.refresh(bid)
    return {
        'id': bid.id,
        'auction_id': bid.auction_id,
        'user_id': bid.user_id,
        'username': user.username,
        'amount': str(bid.amount),
        'placed_at': bid.placed_at.isoformat(),
        'is_winner': bid.is_winner,
    }


@router.post('/{auction_id}/end')
def end_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(models.Auction).filter(models.Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(404, 'Auction not found')
    if _enum_val(auction.status) != 'active':
        raise HTTPException(400, 'Only active auctions can be ended')

    auction.status = models.AuctionStatus.ended

    top_bid = (
        db.query(models.Bid)
        .filter(
            models.Bid.auction_id == auction_id,
            models.Bid.amount >= auction.reserve_price,
        )
        .order_by(desc(models.Bid.amount))
        .first()
    )
    if top_bid:
        top_bid.is_winner = True

    db.commit()
    return {'status': 'ended', 'winner_bid_id': top_bid.id if top_bid else None}


@router.post('/{auction_id}/confirm')
def confirm_auction(auction_id: int, data: schemas.ConfirmAction, db: Session = Depends(get_db)):
    auction = db.query(models.Auction).filter(models.Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(404, 'Auction not found')
    if _enum_val(auction.status) != 'ended':
        raise HTTPException(400, 'Auction must be in ended state to confirm/reject')

    if data.action == 'confirm':
        winner = db.query(models.Bid).filter(
            models.Bid.auction_id == auction_id,
            models.Bid.is_winner == True,
        ).first()
        if not winner:
            raise HTTPException(400, 'No winning bid found (reserve price not met)')

        buyer = db.query(models.User).filter(models.User.id == winner.user_id).first()
        if buyer.balance < winner.amount:
            raise HTTPException(400, 'Buyer has insufficient balance')

        shop_owner = db.query(models.User).filter(models.User.id == auction.shop.user_id).first()
        buyer.balance -= winner.amount
        shop_owner.balance += winner.amount

        tx = models.Transaction(
            auction_id=auction_id,
            buyer_id=winner.user_id,
            shop_id=auction.shop_id,
            final_price=winner.amount,
        )
        auction.status = models.AuctionStatus.confirmed
        auction.inventory_item.status = models.InventoryStatus.sold
        db.add(tx)
    else:
        auction.status = models.AuctionStatus.cancelled
        auction.inventory_item.status = models.InventoryStatus.available
        db.query(models.Bid).filter(models.Bid.auction_id == auction_id).update(
            {'is_winner': False}, synchronize_session=False
        )

    db.commit()
    return {'status': _enum_val(auction.status)}
