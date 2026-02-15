from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List
from models.cart import CartItem
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])

async def get_db():
    from db import db
    return db


# ==============================
# GET CART
# ==============================
@router.get("/")
async def get_cart(
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    cart = await db.carts.find_one({"user_id": user["id"]})

    if not cart:
        return {"items": [], "coupon_code": None}

    cart.pop("_id", None)
    return cart


# ==============================
# ADD ITEM
# ==============================
@router.post("/add")
async def add_to_cart(
    item: CartItem,
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    variant = await db.variants.find_one({
        "id": item.variant_id,
        "is_active": True,
        "in_stock": True
    })

    if not variant:
        raise HTTPException(status_code=400, detail="Variant unavailable")

    cart = await db.carts.find_one({"user_id": user["id"]})

    if not cart:
        cart = {
            "user_id": user["id"],
            "items": [],
            "updated_at": datetime.utcnow().isoformat()
        }

    items = cart.get("items", [])

    existing = next((i for i in items if i["variant_id"] == item.variant_id), None)

    if existing:
        existing["quantity"] += item.quantity
    else:
        items.append({
            "variant_id": item.variant_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "added_at": datetime.utcnow().isoformat()
        })

    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "items": items,
            "updated_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )

    return {"success": True}


# ==============================
# UPDATE QUANTITY
# ==============================
@router.put("/update")
async def update_quantity(
    item: CartItem,
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    cart = await db.carts.find_one({"user_id": user["id"]})

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = cart.get("items", [])

    for i in items:
        if i["variant_id"] == item.variant_id:
            i["quantity"] = max(1, item.quantity)

    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "items": items,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )

    return {"success": True}


# ==============================
# REMOVE ITEM
# ==============================
@router.delete("/remove/{variant_id}")
async def remove_item(
    variant_id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    cart = await db.carts.find_one({"user_id": user["id"]})

    if not cart:
        return {"success": True}

    items = [i for i in cart.get("items", []) if i["variant_id"] != variant_id]

    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "items": items,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )

    return {"success": True}


# ==============================
# CLEAR CART
# ==============================
@router.delete("/")
async def clear_cart(
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    await db.carts.delete_one({"user_id": user["id"]})
    return {"success": True}
