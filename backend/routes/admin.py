from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pymongo.errors import DuplicateKeyError

from middleware.auth_middleware import require_admin_user

from models.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,      # ✅ FIXED IMPORT
    VariantCreate,
    VariantResponse
)
from models.coupon import CouponCreate, CouponResponse
from models.order import OrderResponse, UpdateOrderStatusRequest
from models.settings import Settings, UpdateSettingsRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


async def get_db():
    from db import db
    return db


# ===================== PRODUCTS =====================

@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await require_admin_user(authorization, db)

    # 🔒 VALIDATION
    if not product.name or not product.category or not product.slug:
        raise HTTPException(400, "Name, slug and category are required")

    # 🔒 UNIQUE SLUG
    existing = await db.products.find_one({"slug": product.slug})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Product with same slug already exists"
        )

    product_id = str(uuid.uuid4())

    product_doc = {
        "id": product_id,
        **product.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }

    await db.products.insert_one(product_doc)
    return ProductResponse(**product_doc)

@router.get("/products")
async def get_all_products(
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Admin-safe product list.
    Filters out legacy/broken documents to avoid 500 crashes.
    """
    await require_admin_user(authorization, db)

    products = await db.products.find({}, {"_id": 0}).to_list(200)

    valid_products = []
    for p in products:
        if all(k in p for k in ["name", "slug", "description", "category"]):
            valid_products.append(p)

    return valid_products


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product: ProductUpdate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    update_data = product.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")

    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductResponse(**updated)


@router.put("/products/{product_id}/toggle")
async def toggle_product_status(
    product_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(404, "Product not found")

    new_status = not product.get("is_active", True)

    await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_active": new_status}}
    )

    return {"is_active": new_status}

# ===== FORCE DELETE PRODUCT (DANGEROUS) =====

@router.delete("/products/{product_id}/force", status_code=200)
async def force_delete_product(
    product_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.variants.delete_many({"product_id": product_id})
    await db.products.delete_one({"id": product_id})

    return {
        "success": True,
        "message": "Product permanently deleted"
    }

# ===================== VARIANTS =====================

@router.post("/variants", response_model=VariantResponse)
async def create_variant(
    variant: VariantCreate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    variant_id = str(uuid.uuid4())

    selling_price = variant.mrp - (variant.mrp * variant.discount_percent / 100)

    variant_doc = {
        "id": variant_id,
        **variant.model_dump(),
        "selling_price": round(selling_price, 2),
        "is_active": True,
        "in_stock": variant.in_stock,
    }

    await db.variants.insert_one(variant_doc)

    return VariantResponse(**variant_doc)


@router.get("/variants", response_model=List[VariantResponse])
async def get_variants(
    product_id: Optional[str] = None,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    query = {}
    if product_id:
        query["product_id"] = product_id

    variants = await db.variants.find(query, {"_id": 0}).to_list(200)
    return variants


@router.put("/variants/{variant_id}", response_model=VariantResponse)
async def update_variant(
    variant_id: str,
    variant: VariantCreate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await require_admin_user(authorization, db)

    selling_price = variant.mrp - (variant.mrp * variant.discount_percent / 100)

    update_data = {
        **variant.model_dump(),
        "selling_price": round(selling_price, 2),
    }

    result = await db.variants.update_one(
        {"id": variant_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Variant not found")

    updated = await db.variants.find_one({"id": variant_id}, {"_id": 0})
    return VariantResponse(**updated)


@router.put("/variants/{variant_id}/toggle")
async def toggle_variant_status(
    variant_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    variant = await db.variants.find_one({"id": variant_id})
    if not variant:
        raise HTTPException(404, "Variant not found")

    new_status = not variant.get("is_active", True)

    await db.variants.update_one(
        {"id": variant_id},
        {"$set": {"is_active": new_status}}
    )

    return {"is_active": new_status}


@router.put("/variants/{variant_id}/stock")
async def update_variant_stock(
    variant_id: str,
    in_stock: bool,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    IMPORTANT LOGIC:
    - is_active = can be sold at all
    - in_stock = visible but Add-to-Cart disabled
    """
    await require_admin_user(authorization, db)

    result = await db.variants.update_one(
        {"id": variant_id},
        {"$set": {"in_stock": in_stock}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Variant not found")

    return {"in_stock": in_stock}


# ===================== ORDERS =====================
@router.get('/orders')
async def list_admin_orders(
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)
    orders = await db.orders.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return {'orders': orders}


@router.patch('/orders/{order_id}')
async def patch_admin_order_status(
    order_id: str,
    payload: dict,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)
    new_status = payload.get('order_status')
    allowed = {'CREATED', 'PLACED', 'SHIPPED', 'DELIVERED'}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail={'message': 'Invalid order_status', 'allowed': sorted(list(allowed))})

    result = await db.orders.update_one(
        {'id': order_id},
        {'$set': {'order_status': new_status, 'updated_at': datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Order not found')

    order = await db.orders.find_one({'id': order_id}, {'_id': 0})
    return {'success': True, 'order': order}
