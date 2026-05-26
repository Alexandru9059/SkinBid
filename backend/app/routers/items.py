from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter()
item_types_router = APIRouter()


@router.get('')
def list_games(db: Session = Depends(get_db)):
    return [
        {'id': g.id, 'name': g.name, 'slug': g.slug, 'icon_url': g.icon_url}
        for g in db.query(models.Game).order_by(models.Game.name).all()
    ]


@item_types_router.get('')
def list_item_types(game_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.ItemType)
    if game_id:
        q = q.join(models.ItemCategory).filter(models.ItemCategory.game_id == game_id)
    return [
        {
            'id': t.id,
            'name': t.name,
            'rarity': t.rarity.value,
            'category_id': t.category_id,
            'image_url': t.image_url,
        }
        for t in q.order_by(models.ItemType.name).all()
    ]
