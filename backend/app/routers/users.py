from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter()


@router.get('/{user_id}')
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, 'User not found')
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'balance': user.balance,
    }
