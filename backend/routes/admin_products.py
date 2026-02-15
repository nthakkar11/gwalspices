from fastapi import APIRouter, Depends, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone

from models.product import (
    ProductCreate,
    ProductResponse,
    VariantCreate,
    VariantResponse,
)
from middleware.auth_middleware import require_admin_user

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])


async def get_db():
    from db import db
    return db


# =========================
# PRODUCTS
# =========================

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product: ProductCreate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    update_data = {
        **product.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated


@router.put("/{product_id}/toggle")
async def toggle_product(
    product_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_status = not product.get("is_active", True)

    await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_active": new_status}},
    )

    return {"is_active": new_status}


# =========================
# VARIANTS
# =========================

@router.get("/{product_id}/variants", response_model=List[VariantResponse])
async def get_variants(
    product_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    variants = await db.variants.find(
        {"product_id": product_id},
        {"_id": 0},
    ).to_list(100)

    return variants


@router.put("/variants/{variant_id}", response_model=VariantResponse)
async def update_variant(
    variant_id: str,
    variant: VariantCreate,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    # Auto calculate discount_percent from mrp and selling_price
    if variant.mrp > 0:
        discount_percent = round(
            ((variant.mrp - variant.selling_price) / variant.mrp) * 100,
            2
        )
    else:
        discount_percent = 0

    update_data = {
        **variant.model_dump(),
        "discount_percent": discount_percent,
        "in_stock": variant.in_stock if hasattr(variant, "in_stock") else True,
    }

    result = await db.variants.update_one(
        {"id": variant_id},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Variant not found")

    updated = await db.variants.find_one({"id": variant_id}, {"_id": 0})
    return updated


@router.put("/variants/{variant_id}/stock")
async def toggle_variant_stock(
    variant_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    variant = await db.variants.find_one({"id": variant_id})
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    new_stock = not variant.get("in_stock", True)

    await db.variants.update_one(
        {"id": variant_id},
        {"$set": {"in_stock": new_stock}},
    )

    return {"in_stock": new_stock}


@router.put("/variants/{variant_id}/toggle")
async def toggle_variant_status(
    variant_id: str,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await require_admin_user(authorization, db)

    variant = await db.variants.find_one({"id": variant_id})
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    new_status = not variant.get("is_active", True)

    await db.variants.update_one(
        {"id": variant_id},
        {"$set": {"is_active": new_status}},
    )

    return {"is_active": new_status}
