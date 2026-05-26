from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter()


def _enum_val(v):
    return v.value if hasattr(v, 'value') else v


@router.get('')
def list_shops(db: Session = Depends(get_db)):
    return [
        {
            'id': s.id,
            'name': s.name,
            'verified': s.verified,
            'rating': str(s.rating),
            'user_id': s.user_id,
        }
        for s in db.query(models.Shop).order_by(models.Shop.name).all()
    ]


@router.get('/{shop_id}')
def get_shop(shop_id: int, db: Session = Depends(get_db)):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(404, 'Shop not found')

    stats = db.query(
        func.count(models.Transaction.id).label('total_sales'),
        func.coalesce(func.sum(models.Transaction.final_price), 0).label('total_revenue'),
    ).filter(models.Transaction.shop_id == shop_id).first()

    inventory = [
        {
            'id': item.id,
            'item_type_id': item.item_type_id,
            'item_type_name': item.item_type.name,
            'game_name': item.item_type.category.game.name,
            'rarity': _enum_val(item.item_type.rarity),
            'float_val': str(item.float_val) if item.float_val is not None else None,
            'exterior': _enum_val(item.exterior) if item.exterior else None,
            'status': _enum_val(item.status),
            'acquired_at': item.acquired_at.isoformat(),
            'image_url': item.item_type.image_url,
        }
        for item in shop.inventory_items
    ]

    return {
        'id': shop.id,
        'name': shop.name,
        'verified': shop.verified,
        'rating': str(shop.rating),
        'user_id': shop.user_id,
        'total_sales': stats.total_sales,
        'total_revenue': str(stats.total_revenue),
        'inventory': inventory,
    }
