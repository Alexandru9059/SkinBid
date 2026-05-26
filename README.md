# SkinBid

Multi-game digital item auction marketplace.

SkinBid is a B2C auction platform for in-game digital items — skins, weapons, cosmetics, and collectibles from CS2, Dota 2, Valorant, and TF2. Gaming shops register on the platform, manually curate their inventory, and list items for time-limited auctions. Buyers place competitive bids, and the shop confirms the winning sale before the item is marked as transferred.

## Domain Description

This section contains everything needed to reconstruct the database schema from scratch.

### Games and item taxonomy

The platform supports multiple **games** (e.g. CS2, Dota 2, Valorant, TF2). Each game has its own set of **item categories** — a category belongs to exactly one game, and its name is unique within that game (e.g. CS2 has "Knife", "Rifle", "Gloves"; Dota 2 has "Arcana", "Courier"). Each category contains multiple **item types**, which are templates describing a specific cosmetic (e.g. "Karambit | Fade", "AWP | Dragon Lore"). An item type belongs to exactly one category and carries a fixed **rarity tier**: one of Consumer, Industrial, Mil-Spec, Restricted, Classified, Covert, or Contraband.

### Users and shops

Every account on the platform is a **user** with a unique email, a unique username, and a balance. A user can optionally be a **shop owner**: a shop has a one-to-one relationship with its owner user, a unique shop name, a verified flag, and a rating. A user can own at most one shop. Buyers are plain users with no shop.

### Inventory

A shop owns physical copies of in-game items, stored as **inventory items**. Each inventory item references one item type (the template) and one shop (the owner). It additionally stores the specific copy's **exterior grade** (Factory New, Minimal Wear, Field-Tested, Well-Worn, or Battle-Scarred) and **float value** (a decimal between 0.00 and 1.00 that gives more precise condition tracking within the exterior grade). An inventory item has a status: `available`, `in_auction`, `sold`, or `withdrawn`. The same item type can appear in a shop's inventory multiple times (different physical copies with different floats).

### Auctions

A shop creates an **auction** from one of its `available` inventory items. An auction has a reserve price (minimum acceptable bid, must be > 0), a start timestamp, and an end timestamp (end must be after start). The item's status moves to `in_auction` when the auction is created. An inventory item can be in at most one auction at a time — enforced by a UNIQUE constraint on `inventory_item_id`. Auction status follows the lifecycle: `scheduled → active → ended → confirmed` or `cancelled`.

### Bids

Any user (including shop owners) can place **bids** on an active auction. Each bid records the auction, the bidding user, the amount, and the timestamp. A bid amount must be positive. There is no constraint preventing the same user from bidding multiple times on the same auction. Bids are never deleted — the full history is retained permanently for analytics. When an auction ends, the system marks the highest bid that meets the reserve price as `is_winner = true`.

### Transactions

When a shop **confirms** the winning sale, a **transaction** record is created. It stores the auction, the buyer (winning bidder), the shop, the final price, and the confirmation timestamp. There is exactly one transaction per confirmed auction (enforced by UNIQUE on `auction_id`). On confirmation, the inventory item status becomes `sold`. If the shop **rejects** the sale, the auction is `cancelled`, the item returns to `available`, and no transaction is created.

### Watchlist

Users can follow item types they are interested in via a **watchlist**. A watchlist entry links one user to one item type; the same pair cannot appear twice (UNIQUE constraint on `user_id, item_type_id`).

### Key constraints summary

| Rule | Enforcement |
|------|-------------|
| One item in at most one auction at a time | UNIQUE on `auctions.inventory_item_id` |
| One transaction per auction | UNIQUE on `transactions.auction_id` |
| One shop per user | UNIQUE on `shops.user_id` |
| Reserve price must be positive | CHECK `reserve_price > 0` |
| Auction must end after it starts | CHECK `end_at > start_at` |
| Bid amount must be positive | CHECK `amount > 0` |
| User balance cannot go negative | CHECK `balance >= 0` |
| Float value must be in [0, 1] | CHECK `float_val BETWEEN 0 AND 1` |
| Game + category name is unique | UNIQUE on `(game_id, name)` |
| User + item type watchlist is unique | UNIQUE on `(user_id, item_type_id)` |

## Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Database | PostgreSQL (Supabase) | Native ENUM, rich indexing, free hosted tier |
| Backend | FastAPI (Python) | Async support, auto OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Declarative models, migration management |
| Frontend | React + Vite + Tailwind CSS | Fast, component-based, easy to deploy |
| Deployment DB | Supabase | Free tier, hosted PostgreSQL |
| Deployment Backend | Render.com | Free tier for FastAPI containers |
| Deployment Frontend | Vercel | Free, instant deploys from GitHub |

## Project Structure

```
skinbid/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── routers/
│   │       ├── auctions.py
│   │       ├── shops.py
│   │       ├── items.py
│   │       ├── analytics.py
│   │       └── users.py
│   ├── seed.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx
        │   ├── AuctionDetail.jsx
        │   ├── ShopPage.jsx
        │   └── Analytics.jsx
        └── components/
            ├── Navbar.jsx
            ├── AuctionCard.jsx
            ├── CountdownTimer.jsx
            ├── BidForm.jsx
            └── BidList.jsx
```

## Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| games | Supported game titles | id, name, slug, icon_url |
| item_categories | Category per game (e.g. Knife, Rifle) | id, game_id, name |
| item_types | Specific item template | id, category_id, name, rarity, image_url |
| shops | Business seller accounts | id, user_id, name, verified, rating |
| users | Buyer/seller accounts | id, email, username, balance, created_at |
| inventory_items | Physical item a shop owns | id, shop_id, item_type_id, float_val, exterior, status |
| auctions | Time-limited sale of one item | id, inventory_item_id, shop_id, reserve_price, start_at, end_at, status |
| bids | A buyer's bid on an auction | id, auction_id, user_id, amount, placed_at |
| transactions | Confirmed sale record | id, auction_id, buyer_id, shop_id, final_price, confirmed_at |
| watchlist | Users following an item type | id, user_id, item_type_id, created_at |

## Database Schema

![Database Schema](./schema/dbdiagram.png)

**ENUMs:**
- `rarity_tier` — Consumer, Industrial, Mil-Spec, Restricted, Classified, Covert, Contraband
- `item_exterior` — Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred
- `inventory_status` — available, in_auction, sold, withdrawn
- `auction_status` — scheduled, active, ended, confirmed, cancelled

### SQL DDL

```sql
CREATE TABLE games (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(50)  NOT NULL UNIQUE,
  icon_url   TEXT,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE item_categories (
  id      SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name    VARCHAR(100) NOT NULL,
  UNIQUE(game_id, name)
);

CREATE TYPE rarity_tier AS ENUM (
  'Consumer','Industrial','Mil-Spec',
  'Restricted','Classified','Covert','Contraband'
);

CREATE TABLE item_types (
  id          SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES item_categories(id),
  name        VARCHAR(200) NOT NULL,
  rarity      rarity_tier NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  username   VARCHAR(100) NOT NULL UNIQUE,
  balance    NUMERIC(12,2) DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shops (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE REFERENCES users(id),
  name       VARCHAR(150) NOT NULL UNIQUE,
  verified   BOOLEAN DEFAULT FALSE,
  rating     NUMERIC(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE item_exterior AS ENUM (
  'Factory New','Minimal Wear','Field-Tested',
  'Well-Worn','Battle-Scarred'
);

CREATE TYPE inventory_status AS ENUM (
  'available','in_auction','sold','withdrawn'
);

CREATE TABLE inventory_items (
  id           SERIAL PRIMARY KEY,
  shop_id      INT NOT NULL REFERENCES shops(id),
  item_type_id INT NOT NULL REFERENCES item_types(id),
  float_val    NUMERIC(10,8) CHECK (float_val BETWEEN 0 AND 1),
  exterior     item_exterior,
  status       inventory_status DEFAULT 'available',
  acquired_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE auction_status AS ENUM (
  'scheduled','active','ended','confirmed','cancelled'
);

CREATE TABLE auctions (
  id                SERIAL PRIMARY KEY,
  inventory_item_id INT NOT NULL UNIQUE REFERENCES inventory_items(id),
  shop_id           INT NOT NULL REFERENCES shops(id),
  reserve_price     NUMERIC(12,2) NOT NULL CHECK (reserve_price > 0),
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL CHECK (end_at > start_at),
  status            auction_status DEFAULT 'scheduled',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bids (
  id         SERIAL PRIMARY KEY,
  auction_id INT NOT NULL REFERENCES auctions(id),
  user_id    INT NOT NULL REFERENCES users(id),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  placed_at  TIMESTAMPTZ DEFAULT NOW(),
  is_winner  BOOLEAN DEFAULT FALSE
);

CREATE TABLE transactions (
  id           SERIAL PRIMARY KEY,
  auction_id   INT NOT NULL UNIQUE REFERENCES auctions(id),
  buyer_id     INT NOT NULL REFERENCES users(id),
  shop_id      INT NOT NULL REFERENCES shops(id),
  final_price  NUMERIC(12,2) NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlist (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id),
  item_type_id INT NOT NULL REFERENCES item_types(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type_id)
);
```

### DBML (dbdiagram.io)

```
Table games { id int [pk, increment]; name varchar; slug varchar; icon_url text }
Table item_categories { id int [pk, increment]; game_id int [ref: > games.id]; name varchar }
Table item_types { id int [pk, increment]; category_id int [ref: > item_categories.id]; name varchar; rarity varchar; image_url text }
Table users { id int [pk, increment]; email varchar; username varchar; balance decimal; created_at timestamp }
Table shops { id int [pk, increment]; user_id int [ref: - users.id]; name varchar; verified bool; rating decimal }
Table inventory_items { id int [pk, increment]; shop_id int [ref: > shops.id]; item_type_id int [ref: > item_types.id]; float_val decimal; exterior varchar; status varchar }
Table auctions { id int [pk, increment]; inventory_item_id int [ref: - inventory_items.id]; shop_id int [ref: > shops.id]; reserve_price decimal; start_at timestamp; end_at timestamp; status varchar }
Table bids { id int [pk, increment]; auction_id int [ref: > auctions.id]; user_id int [ref: > users.id]; amount decimal; placed_at timestamp; is_winner bool }
Table transactions { id int [pk, increment]; auction_id int [ref: - auctions.id]; buyer_id int [ref: > users.id]; shop_id int [ref: > shops.id]; final_price decimal; confirmed_at timestamp }
Table watchlist { id int [pk, increment]; user_id int [ref: > users.id]; item_type_id int [ref: > item_types.id] }
```

## User Scenarios

**Scenario A — Shop lists an item for auction**
1. Shop selects an inventory item with `status = available`
2. Sets reserve price, start time, and duration
3. System creates an auction record with `status = active`
4. At `end_at`, status changes to `ended`

**Scenario B — Buyer places a bid**
1. Buyer browses active auctions, filtered by game or item type
2. Opens auction detail — sees current highest bid and time remaining
3. Places a bid amount > current highest bid and >= reserve_price
4. System inserts a bid record; previous highest bid is outbid

**Scenario C — Auction ends and shop confirms sale**
1. Auction `end_at` passes — status changes to `ended`
2. System identifies the bid with the highest amount as the winner
3. Shop receives notification to confirm or reject
4. On confirmation: transaction record created, inventory item `status = sold`
5. On rejection: item returns to `available`, auction `status = cancelled`

## Auction Lifecycle

```
scheduled → active → ended → confirmed
                           ↘ cancelled
```

1. Auction is created with `status = active`
2. Buyers place bids — each bid must exceed the previous highest and the reserve price
3. Shop clicks **End Auction** → status becomes `ended`, highest qualifying bid is flagged as winner
4. Shop clicks **Confirm Sale** → `Transaction` record created, item marked `sold`
   Or **Reject Sale** → item returns to `available`, auction `cancelled`

## Indexes & Performance

```sql
CREATE INDEX idx_bids_auction_id     ON bids(auction_id);
CREATE INDEX idx_bids_placed_at      ON bids(placed_at DESC);
CREATE INDEX idx_bids_user_id        ON bids(user_id);

CREATE INDEX idx_auctions_status     ON auctions(status);
CREATE INDEX idx_auctions_end_at     ON auctions(end_at);
CREATE INDEX idx_auctions_shop_id    ON auctions(shop_id);

CREATE INDEX idx_inventory_shop_status ON inventory_items(shop_id, status);
CREATE INDEX idx_inventory_item_type   ON inventory_items(item_type_id);

CREATE INDEX idx_tx_confirmed_at     ON transactions(confirmed_at DESC);
CREATE INDEX idx_tx_shop_id          ON transactions(shop_id);

CREATE INDEX idx_item_types_category ON item_types(category_id);

-- Partial index: only active auctions (speeds up live auction feed)
CREATE INDEX idx_auctions_active ON auctions(end_at) WHERE status = 'active';
```

Additional design decisions:
- Composite index on `bids(auction_id, amount DESC)` for O(1) current highest bid lookup
- `NUMERIC(12,2)` for all monetary values — avoids float precision issues
- ENUM types stored as integers internally — faster comparisons than VARCHAR
- `UNIQUE` on `auctions.inventory_item_id` ensures one item can only be in one auction at a time

## Analytical Queries

**Query 1 — Top 5 most bid-on item types (last 30 days)**

```sql
SELECT it.name AS item_type, g.name AS game, it.rarity,
       COUNT(b.id) AS total_bids,
       ROUND(AVG(b.amount), 2) AS avg_bid_amount,
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
LIMIT 5;
```

**Query 2 — Total revenue per shop from confirmed sales (last 30 days)**

```sql
SELECT s.name AS shop_name, s.verified,
       COUNT(t.id) AS total_sales,
       SUM(t.final_price) AS total_revenue,
       ROUND(AVG(t.final_price), 2) AS avg_sale_price
FROM transactions t
JOIN shops s ON t.shop_id = s.id
WHERE t.confirmed_at >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name, s.verified
ORDER BY total_revenue DESC;
```

**Query 3 — Price trend for a specific item type (last 6 months)**

```sql
SELECT DATE_TRUNC('week', t.confirmed_at) AS week,
       it.name AS item_type,
       COUNT(t.id) AS sales_count,
       ROUND(AVG(t.final_price), 2) AS avg_price,
       MIN(t.final_price) AS min_price,
       MAX(t.final_price) AS max_price
FROM transactions t
JOIN auctions a ON t.auction_id = a.id
JOIN inventory_items ii ON a.inventory_item_id = ii.id
JOIN item_types it ON ii.item_type_id = it.id
WHERE it.id = :item_type_id
  AND t.confirmed_at >= NOW() - INTERVAL '6 months'
GROUP BY week, it.name
ORDER BY week ASC;
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/games` | List all games |
| GET | `/item-types?game_id=` | Item types, optionally filtered by game |
| GET | `/auctions?status=&game_id=` | List auctions (default: active) |
| GET | `/auctions/{id}` | Auction detail with bid history |
| POST | `/auctions` | Create a new auction |
| POST | `/auctions/{id}/bids` | Place a bid `{user_id, amount}` |
| POST | `/auctions/{id}/end` | Manually end an active auction |
| POST | `/auctions/{id}/confirm` | Confirm or reject a sale `{action: "confirm"\|"reject"}` |
| GET | `/shops` | List all shops |
| GET | `/shops/{id}` | Shop detail with inventory |
| GET | `/users/{id}` | User info |
| GET | `/analytics/top-items` | Top 5 most bid-on item types (last 30 days) |
| GET | `/analytics/shop-revenue` | Revenue leaderboard (last 30 days) |
| GET | `/analytics/price-trend/{item_type_id}` | Weekly price trend (last 6 months) |

## Setup

### 1. Supabase database

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection pooling → Session mode → URI**
3. Copy the connection string — you'll need it in the next step

> Use the **Session pooler** URL (not the direct connection) to avoid IPv6 issues on some networks.

### 2. Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and paste your Supabase connection string

python seed.py       # drops schema, creates tables, inserts fake data
uvicorn app.main:app --reload
```

API: **http://localhost:8000** — interactive docs: **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173** — proxies `/api/*` to the backend automatically.

## Fake Data (seed.py)

Seeding order respects foreign key constraints:

1. 4 games (CS2, Dota 2, Valorant, TF2)
2. 3–5 item categories per game
3. 5–10 item types per category with random rarity
4. 100 users with random balances
5. 20 shops (first 20 users), verified randomly
6. 50–100 inventory items per shop with realistic float values per exterior grade
7. ~40% of inventory items converted to auctions (mix of active, ended, confirmed, cancelled)
8. 3–25 escalating bids per auction
9. Transactions for all confirmed auctions

Uses a fixed random seed (42) for reproducibility.

## Deployment

| Service | Platform |
|---------|----------|
| PostgreSQL DB | Supabase |
| FastAPI Backend | Render.com |
| React Frontend | Vercel |

### Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# frontend/.env
VITE_API_URL=https://skinbid-api.onrender.com
```

## Demo Notes

- Authentication is not implemented. Use the **User ID** field in the navbar to switch between users.
- Users 1–20 are shop owners; users 21–100 are buyers.
- The seed script always wipes and recreates the schema — run it once before starting.
