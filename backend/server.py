from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from routes.checkout import router as checkout_router
from pymongo.errors import OperationFailure

import os
import logging
from pathlib import Path
from db import client

# ROUTES
from routes import auth, products, coupons, orders, admin, admin_products, contact, gokwik, cart, payment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB

app = FastAPI(title="GWAL Spices API", version="1.0.0")

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "GWAL Spices API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# ROUTE ORDER MATTERS
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(coupons.router)
api_router.include_router(orders.router)
api_router.include_router(gokwik.router)
api_router.include_router(cart.router)
api_router.include_router(payment.router)

# ADMIN
api_router.include_router(admin_products.router)
api_router.include_router(admin.router)
api_router.include_router(checkout_router)

app.include_router(api_router)
app.include_router(contact.router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


async def _ensure_cart_user_index(db):
    """
    Create a unique index on carts.user_id if one does not already exist.

    If an equivalent key-pattern index already exists under a different name
    (e.g. MongoDB default `user_id_1`), skip creation to keep startup idempotent.
    """
    existing_indexes = await db.carts.index_information()

    for _, meta in existing_indexes.items():
        if meta.get("key") == [("user_id", 1)]:
            return

    try:
        await db.carts.create_index("user_id", unique=True, name="idx_carts_user_id")
    except OperationFailure as exc:
        if exc.code == 85:
            logger.warning("Cart user_id index already exists with different name; skipping creation.")
            return
        raise


@app.on_event("startup")
async def startup_indexes():
    from db import db

    await _ensure_cart_user_index(db)
