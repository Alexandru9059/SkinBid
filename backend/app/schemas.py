from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class BidCreate(BaseModel):
    user_id: int
    amount: float


class AuctionCreate(BaseModel):
    inventory_item_id: int
    shop_id: int
    reserve_price: float
    start_at: datetime
    end_at: datetime


class ConfirmAction(BaseModel):
    action: Literal['confirm', 'reject']
