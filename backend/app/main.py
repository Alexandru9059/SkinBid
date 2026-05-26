from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auctions, shops, items, analytics, users

app = FastAPI(title='SkinBid API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(items.router, prefix='/games', tags=['games'])
app.include_router(items.item_types_router, prefix='/item-types', tags=['item-types'])
app.include_router(auctions.router, prefix='/auctions', tags=['auctions'])
app.include_router(shops.router, prefix='/shops', tags=['shops'])
app.include_router(analytics.router, prefix='/analytics', tags=['analytics'])
app.include_router(users.router, prefix='/users', tags=['users'])


@app.get('/')
def root():
    return {'message': 'SkinBid API', 'docs': '/docs'}
