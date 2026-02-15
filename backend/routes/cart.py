from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from models.cart import CartItem
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])

async def get_db():
    from db import db
    return db


def _require_user_id(user: dict) -> str:
    user_id = user.get("id") if user else None
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Authenticated user ID is missing from the token context.",
                "code": "AUTH_USER_ID_MISSING",
            },
        )
    return user_id


# ==============================
# GET CART
# ==============================
@router.get("/")
async def get_cart(
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    user_id = _require_user_id(user)
    cart = await db.carts.find_one({"user_id": user_id})

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
    user_id = _require_user_id(user)
    variant = await db.variants.find_one({
        "id": item.variant_id,
        "is_active": True,
        "in_stock": True
    })

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Variant is unavailable or out of stock.",
                "code": "VARIANT_UNAVAILABLE",
                "variant_id": item.variant_id,
            },
        )

    cart = await db.carts.find_one({"user_id": user_id})

    if not cart:
        cart = {
            "user_id": user_id,
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
        {"user_id": user_id},
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
    user_id = _require_user_id(user)
    cart = await db.carts.find_one({"user_id": user_id})

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Cart was not found for the authenticated user.",
                "code": "CART_NOT_FOUND",
                "user_id": user_id,
            },
        )

    items = cart.get("items", [])
    updated = False

    for i in items:
        if i["variant_id"] == item.variant_id:
            i["quantity"] = max(1, item.quantity)
            updated = True

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Variant not found in the authenticated user's cart.",
                "code": "CART_ITEM_NOT_FOUND",
                "variant_id": item.variant_id,
                "user_id": user_id,
            },
        )

    await db.carts.update_one(
        {"user_id": user_id},
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
    user_id = _require_user_id(user)
    cart = await db.carts.find_one({"user_id": user_id})

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Cart was not found for the authenticated user.",
                "code": "CART_NOT_FOUND",
                "user_id": user_id,
            },
        )

    items = [i for i in cart.get("items", []) if i["variant_id"] != variant_id]

    if len(items) == len(cart.get("items", [])):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Variant not found in the authenticated user's cart.",
                "code": "CART_ITEM_NOT_FOUND",
                "variant_id": variant_id,
                "user_id": user_id,
            },
        )

    await db.carts.update_one(
        {"user_id": user_id},
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
    user_id = _require_user_id(user)
    await db.carts.delete_one({"user_id": user_id})
    return {"success": True}
