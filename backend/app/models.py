import enum
from sqlalchemy import (
    Boolean, CheckConstraint, Column, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint,
    TIMESTAMP,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RarityTier(str, enum.Enum):
    Consumer = 'Consumer'
    Industrial = 'Industrial'
    MilSpec = 'Mil-Spec'
    Restricted = 'Restricted'
    Classified = 'Classified'
    Covert = 'Covert'
    Contraband = 'Contraband'


class ItemExterior(str, enum.Enum):
    FactoryNew = 'Factory New'
    MinimalWear = 'Minimal Wear'
    FieldTested = 'Field-Tested'
    WellWorn = 'Well-Worn'
    BattleScarred = 'Battle-Scarred'


class InventoryStatus(str, enum.Enum):
    available = 'available'
    in_auction = 'in_auction'
    sold = 'sold'
    withdrawn = 'withdrawn'


class AuctionStatus(str, enum.Enum):
    scheduled = 'scheduled'
    active = 'active'
    ended = 'ended'
    confirmed = 'confirmed'
    cancelled = 'cancelled'


class Game(Base):
    __tablename__ = 'games'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(50), nullable=False, unique=True)
    icon_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    categories = relationship('ItemCategory', back_populates='game', cascade='all, delete-orphan')


class ItemCategory(Base):
    __tablename__ = 'item_categories'
    __table_args__ = (UniqueConstraint('game_id', 'name'),)

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey('games.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)

    game = relationship('Game', back_populates='categories')
    item_types = relationship('ItemType', back_populates='category')


class ItemType(Base):
    __tablename__ = 'item_types'

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey('item_categories.id'), nullable=False)
    name = Column(String(200), nullable=False)
    rarity = Column(SAEnum(RarityTier, name='rarity_tier'), nullable=False)
    image_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    category = relationship('ItemCategory', back_populates='item_types')
    inventory_items = relationship('InventoryItem', back_populates='item_type')
    watchlist_entries = relationship('Watchlist', back_populates='item_type')


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (CheckConstraint('balance >= 0'),)

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    username = Column(String(100), nullable=False, unique=True)
    balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    shop = relationship('Shop', back_populates='user', uselist=False)
    bids = relationship('Bid', back_populates='user')
    transactions = relationship('Transaction', back_populates='buyer', foreign_keys='Transaction.buyer_id')
    watchlist = relationship('Watchlist', back_populates='user')


class Shop(Base):
    __tablename__ = 'shops'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    name = Column(String(150), nullable=False, unique=True)
    verified = Column(Boolean, nullable=False, default=False)
    rating = Column(Numeric(3, 2), nullable=False, default=0.00)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship('User', back_populates='shop')
    inventory_items = relationship('InventoryItem', back_populates='shop')
    auctions = relationship('Auction', back_populates='shop')
    transactions = relationship('Transaction', back_populates='shop', foreign_keys='Transaction.shop_id')


class InventoryItem(Base):
    __tablename__ = 'inventory_items'

    id = Column(Integer, primary_key=True)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    item_type_id = Column(Integer, ForeignKey('item_types.id'), nullable=False)
    float_val = Column(Numeric(10, 8))
    exterior = Column(SAEnum(ItemExterior, name='item_exterior'))
    status = Column(SAEnum(InventoryStatus, name='inventory_status'), nullable=False, default=InventoryStatus.available)
    acquired_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    shop = relationship('Shop', back_populates='inventory_items')
    item_type = relationship('ItemType', back_populates='inventory_items')
    auction = relationship('Auction', back_populates='inventory_item', uselist=False)


class Auction(Base):
    __tablename__ = 'auctions'
    __table_args__ = (
        CheckConstraint('reserve_price > 0'),
        CheckConstraint('end_at > start_at'),
    )

    id = Column(Integer, primary_key=True)
    inventory_item_id = Column(Integer, ForeignKey('inventory_items.id'), nullable=False, unique=True)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    reserve_price = Column(Numeric(12, 2), nullable=False)
    start_at = Column(TIMESTAMP(timezone=True), nullable=False)
    end_at = Column(TIMESTAMP(timezone=True), nullable=False)
    status = Column(SAEnum(AuctionStatus, name='auction_status'), nullable=False, default=AuctionStatus.scheduled)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    inventory_item = relationship('InventoryItem', back_populates='auction')
    shop = relationship('Shop', back_populates='auctions')
    bids = relationship('Bid', back_populates='auction')
    transaction = relationship('Transaction', back_populates='auction', uselist=False)


class Bid(Base):
    __tablename__ = 'bids'
    __table_args__ = (CheckConstraint('amount > 0'),)

    id = Column(Integer, primary_key=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    placed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    is_winner = Column(Boolean, nullable=False, default=False)

    auction = relationship('Auction', back_populates='bids')
    user = relationship('User', back_populates='bids')


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'), nullable=False, unique=True)
    buyer_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    final_price = Column(Numeric(12, 2), nullable=False)
    confirmed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    auction = relationship('Auction', back_populates='transaction')
    buyer = relationship('User', back_populates='transactions', foreign_keys=[buyer_id])
    shop = relationship('Shop', back_populates='transactions', foreign_keys=[shop_id])


class Watchlist(Base):
    __tablename__ = 'watchlist'
    __table_args__ = (UniqueConstraint('user_id', 'item_type_id'),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    item_type_id = Column(Integer, ForeignKey('item_types.id'), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship('User', back_populates='watchlist')
    item_type = relationship('ItemType', back_populates='watchlist_entries')
