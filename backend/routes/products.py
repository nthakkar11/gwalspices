from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.product import ProductWithVariants
from typing import List, Optional

router = APIRouter(prefix="/products", tags=["Products"])

async def get_db():
    from db import db
    return db


@router.get("", response_model=List[ProductWithVariants])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {"is_active": True}

    if category:
        query["category"] = category

    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    products = await db.products.find(query, {"_id": 0}).to_list(100)

    for product in products:
        variants = await db.variants.find(
            {
                "product_id": product["id"],
                "is_active": True
            },
            {"_id": 0}
        ).to_list(50)

        product["variants"] = variants

    return products


@router.get("/{slug}", response_model=ProductWithVariants)
async def get_product_by_slug(
    slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    product = await db.products.find_one(
        {"slug": slug, "is_active": True},
        {"_id": 0}
    )

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variants = await db.variants.find(
        {
            "product_id": product["id"],
            "is_active": True
        },
        {"_id": 0}
    ).to_list(50)

    product["variants"] = variants
    return product
