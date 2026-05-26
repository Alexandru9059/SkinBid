from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


@router.get('/top-items')
def top_items(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            it.name AS item_type,
            g.name AS game,
            it.rarity,
            COUNT(b.id) AS total_bids,
            ROUND(AVG(b.amount)::numeric, 2) AS avg_bid_amount,
            MAX(b.amount) AS highest_bid
        FROM bids b
        JOIN auctions a ON b.auction_id = a.id
        JOIN inventory_items ii ON a.inventory_item_id = ii.id
        JOIN item_types it ON ii.item_type_id = it.id
        JOIN item_categories ic ON it.category_id = ic.id
        JOIN games g ON ic.game_id = g.id
        WHERE b.placed_at >= NOW() - INTERVAL '30 days'
        GROUP BY it.id, it.name, g.name, it.rarity
        ORDER BY total_bids DESC
        LIMIT 5
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get('/shop-revenue')
def shop_revenue(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            s.name AS shop_name,
            s.verified,
            COUNT(t.id) AS total_sales,
            SUM(t.final_price) AS total_revenue,
            ROUND(AVG(t.final_price)::numeric, 2) AS avg_sale_price
        FROM transactions t
        JOIN shops s ON t.shop_id = s.id
        WHERE t.confirmed_at >= NOW() - INTERVAL '30 days'
        GROUP BY s.id, s.name, s.verified
        ORDER BY total_revenue DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get('/price-trend/{item_type_id}')
def price_trend(item_type_id: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            DATE_TRUNC('week', t.confirmed_at) AS week,
            it.name AS item_type,
            COUNT(t.id) AS sales_count,
            ROUND(AVG(t.final_price)::numeric, 2) AS avg_price,
            MIN(t.final_price) AS min_price,
            MAX(t.final_price) AS max_price
        FROM transactions t
        JOIN auctions a ON t.auction_id = a.id
        JOIN inventory_items ii ON a.inventory_item_id = ii.id
        JOIN item_types it ON ii.item_type_id = it.id
        WHERE it.id = :item_type_id
          AND t.confirmed_at >= NOW() - INTERVAL '6 months'
        GROUP BY week, it.name
        ORDER BY week ASC
    """), {'item_type_id': item_type_id}).mappings().all()
    return [dict(r) for r in rows]
