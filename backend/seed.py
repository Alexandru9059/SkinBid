import os
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from dotenv import load_dotenv
from faker import Faker
from sqlalchemy import text

load_dotenv()

from app.database import engine, SessionLocal, Base
from app import models

fake = Faker()
random.seed(42)
Faker.seed(42)

GAMES = [
    ('CS2', 'cs2'),
    ('Dota 2', 'dota2'),
    ('Valorant', 'valorant'),
    ('TF2', 'tf2'),
]

CATEGORIES = {
    'CS2': ['Knife', 'Rifle', 'Pistol', 'Gloves', 'SMG'],
    'Dota 2': ['Arcana', 'Courier', 'Immortal', 'Prestige'],
    'Valorant': ['Knife', 'Gun Buddy', 'Player Card', 'Spray'],
    'TF2': ['Hat', 'Weapon', 'Misc', 'Tool'],
}

ITEM_NAMES = {
    'CS2': {
        'Knife': ['Butterfly Knife | Doppler', 'Karambit | Fade', 'M9 Bayonet | Marble Fade',
                  'Bowie Knife | Tiger Tooth', 'Talon Knife | Crimson Web', 'Stiletto Knife | Night'],
        'Rifle': ['AK-47 | Asiimov', 'M4A4 | Howl', 'M4A1-S | Hyper Beast',
                  'AWP | Dragon Lore', 'AWP | Asiimov', 'FAMAS | Valence'],
        'Pistol': ['Desert Eagle | Blaze', 'USP-S | Kill Confirmed', 'Glock-18 | Fade',
                   'P250 | Asiimov', 'CZ75-Auto | Victoria'],
        'Gloves': ['Sport Gloves | Pandoras Box', 'Moto Gloves | Spearmint',
                   'Specialist Gloves | Crimson Kimono', 'Bloodhound Gloves | Charred'],
        'SMG': ['MP5-SD | Phosphor', 'MP9 | Hypnotic', 'MAC-10 | Neon Rider'],
    },
    'Dota 2': {
        'Arcana': ['Windranger Arcana', 'Juggernaut Arcana', 'Crystal Maiden Arcana', 'Pudge Arcana'],
        'Courier': ['Golden Baby Roshan', 'Frosty Roshan', 'Corrupted Roshan', 'Axe Courier'],
        'Immortal': ['Inscribed Dragon Lance', 'Ethereal Phylactery', 'Inscribed Dagon', 'Dragonclaw Hook'],
        'Prestige': ['Prestige Axe Set', 'Prestige Invoker Set'],
    },
    'Valorant': {
        'Knife': ['Elderflame Dagger', 'Origin Karambit', 'Glitchpop Dagger', 'Reaver Karambit'],
        'Gun Buddy': ['Valorant Logo Buddy', 'Ghost Buddy', 'Penguin Buddy', 'Poro Buddy'],
        'Player Card': ['Immortal Card', 'Radiant Card', 'Fracture Agent Card'],
        'Spray': ['Victory Spray', 'Headshot Spray', 'Diss Track Spray'],
    },
    'TF2': {
        'Hat': ['Team Captain', 'Genuine Anger', 'Vintage Tyrolean', 'Burning Team Captain'],
        'Weapon': ['Australium Rocket Launcher', 'Australium Minigun', 'Golden Frying Pan'],
        'Misc': ['Max Head', "Bill's Hat", 'Earbuds'],
        'Tool': ['Name Tag', 'Mann Co. Supply Crate Key', 'Strangifier'],
    },
}

RARITIES = list(models.RarityTier)
EXTERIORS = list(models.ItemExterior)

FLOAT_RANGES = {
    models.ItemExterior.FactoryNew: (0.00, 0.07),
    models.ItemExterior.MinimalWear: (0.07, 0.15),
    models.ItemExterior.FieldTested: (0.15, 0.38),
    models.ItemExterior.WellWorn: (0.38, 0.45),
    models.ItemExterior.BattleScarred: (0.45, 1.00),
}


def now_utc():
    return datetime.now(timezone.utc)


def reset_db():
    print('Dropping existing tables and types...')
    Base.metadata.drop_all(engine)
    with engine.begin() as conn:
        for name in ['rarity_tier', 'item_exterior', 'inventory_status', 'auction_status']:
            conn.execute(text(f'DROP TYPE IF EXISTS {name} CASCADE'))
    print('Creating tables...')
    Base.metadata.create_all(engine)


def seed():
    db = SessionLocal()
    try:
        game_map = {}
        for name, slug in GAMES:
            g = models.Game(name=name, slug=slug)
            db.add(g)
            db.flush()
            game_map[name] = g

        all_item_types = []
        for game_name, cat_names in CATEGORIES.items():
            game = game_map[game_name]
            for cat_name in cat_names:
                cat = models.ItemCategory(game_id=game.id, name=cat_name)
                db.add(cat)
                db.flush()
                names = ITEM_NAMES.get(game_name, {}).get(cat_name, [f'{cat_name} Item {i}' for i in range(1, 6)])
                for item_name in names:
                    it = models.ItemType(
                        category_id=cat.id,
                        name=item_name,
                        rarity=random.choice(RARITIES),
                    )
                    db.add(it)
                    db.flush()
                    all_item_types.append(it)

        users = []
        seen_emails, seen_usernames = set(), set()
        for _ in range(100):
            email = fake.email()
            while email in seen_emails:
                email = fake.email()
            seen_emails.add(email)

            username = fake.user_name()
            while username in seen_usernames:
                username = f'{fake.user_name()}{random.randint(10, 999)}'
            seen_usernames.add(username)

            u = models.User(
                email=email,
                username=username,
                balance=Decimal(str(round(random.uniform(100, 10000), 2))),
            )
            db.add(u)
            db.flush()
            users.append(u)

        shops = []
        seen_names = set()
        for i in range(20):
            name = fake.company()
            while name in seen_names:
                name = fake.company()
            seen_names.add(name)

            s = models.Shop(
                user_id=users[i].id,
                name=name,
                verified=random.choice([True, False]),
                rating=Decimal(str(round(random.uniform(2.0, 5.0), 2))),
            )
            db.add(s)
            db.flush()
            shops.append(s)

        all_inventory = []
        for shop in shops:
            for _ in range(random.randint(50, 100)):
                exterior = random.choice(EXTERIORS)
                lo, hi = FLOAT_RANGES[exterior]
                fv = round(random.uniform(lo, hi), 8)
                inv = models.InventoryItem(
                    shop_id=shop.id,
                    item_type_id=random.choice(all_item_types).id,
                    float_val=Decimal(str(fv)),
                    exterior=exterior,
                    status=models.InventoryStatus.available,
                    acquired_at=now_utc() - timedelta(days=random.randint(1, 365)),
                )
                db.add(inv)
                db.flush()
                all_inventory.append(inv)

        auction_pool = random.sample(all_inventory, int(len(all_inventory) * 0.4))
        STATUS_WEIGHTS = (
            [models.AuctionStatus.active] * 5
            + [models.AuctionStatus.ended] * 2
            + [models.AuctionStatus.confirmed] * 2
            + [models.AuctionStatus.cancelled] * 1
        )

        auction_records = []
        for inv in auction_pool:
            status = random.choice(STATUS_WEIGHTS)
            now = now_utc()

            if status == models.AuctionStatus.active:
                start_at = now - timedelta(hours=random.randint(1, 12))
                end_at = now + timedelta(hours=random.randint(1, 48))
            elif status == models.AuctionStatus.scheduled:
                start_at = now + timedelta(hours=random.randint(1, 24))
                end_at = start_at + timedelta(hours=random.randint(12, 48))
            else:
                end_at = now - timedelta(hours=random.randint(1, 72))
                start_at = end_at - timedelta(hours=random.randint(12, 48))

            reserve = Decimal(str(round(random.uniform(10, 500), 2)))
            auction = models.Auction(
                inventory_item_id=inv.id,
                shop_id=inv.shop_id,
                reserve_price=reserve,
                start_at=start_at,
                end_at=end_at,
                status=status,
            )
            if status == models.AuctionStatus.active:
                inv.status = models.InventoryStatus.in_auction
            elif status == models.AuctionStatus.confirmed:
                inv.status = models.InventoryStatus.sold

            db.add(auction)
            db.flush()
            auction_records.append((auction, status))

        buyers = users[20:]
        for auction, status in auction_records:
            if status == models.AuctionStatus.cancelled and random.random() < 0.4:
                continue

            n = random.randint(3, 25)
            base = float(auction.reserve_price) * random.uniform(0.9, 1.3)

            bid_objs = []
            now = now_utc()
            duration_min = max(1, int((auction.end_at - auction.start_at).total_seconds() / 60))

            for i in range(n):
                amount = Decimal(str(round(base + i * random.uniform(5, 50), 2)))
                offset_min = random.randint(0, duration_min)
                placed_at = auction.start_at + timedelta(minutes=offset_min)
                if status == models.AuctionStatus.active and placed_at > now:
                    placed_at = now - timedelta(minutes=random.randint(1, 30))

                bid = models.Bid(
                    auction_id=auction.id,
                    user_id=random.choice(buyers).id,
                    amount=amount,
                    placed_at=placed_at,
                    is_winner=False,
                )
                db.add(bid)
                bid_objs.append(bid)

            db.flush()

            if status in (models.AuctionStatus.ended, models.AuctionStatus.confirmed) and bid_objs:
                winner = max(bid_objs, key=lambda b: b.amount)
                if winner.amount >= auction.reserve_price:
                    winner.is_winner = True
                    if status == models.AuctionStatus.confirmed:
                        tx = models.Transaction(
                            auction_id=auction.id,
                            buyer_id=winner.user_id,
                            shop_id=auction.shop_id,
                            final_price=winner.amount,
                            confirmed_at=auction.end_at + timedelta(hours=random.randint(1, 6)),
                        )
                        db.add(tx)

        db.commit()
        print(
            f'Seeded: {len(GAMES)} games, {len(all_item_types)} item types, '
            f'{len(users)} users, {len(shops)} shops, {len(all_inventory)} inventory items, '
            f'{len(auction_records)} auctions'
        )

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    print('Resetting database...')
    reset_db()
    print('Seeding data...')
    seed()
    print('Done!')
