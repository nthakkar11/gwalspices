from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from middleware.auth_middleware import get_current_user
from models.cart import CartItem

router = APIRouter(prefix="/cart", tags=["Cart"])


class CartValidateRequest(BaseModel):
    items: list[dict]


async def get_db():
    from db import db

    return db


def _require_user_id(user: dict) -> str:
    user_id = user.get("id") if user else None
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Authenticated user ID is missing from token context.", "code": "AUTH_USER_ID_MISSING"},
        )
    return user_id


async def _calculate_cart_total(db, items: list[dict]) -> float:
    total = 0.0
    for item in items:
        variant = await db.variants.find_one({"id": item["variant_id"]}, {"_id": 0, "selling_price": 1})
        if not variant:
            continue
        total += float(variant.get("selling_price", 0)) * int(item.get("quantity", 0))
    return round(total, 2)


@router.get("/")
async def get_cart(user: dict = Depends(get_current_user), db=Depends(get_db)):
    user_id = _require_user_id(user)
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})

    if not cart:
        return {"items": [], "total": 0.0, "coupon_code": None}

    items = cart.get("items", [])
    total = await _calculate_cart_total(db, items)
    return {"items": items, "total": total, "coupon_code": cart.get("coupon_code")}


@router.post("/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user), db=Depends(get_db)):
    user_id = _require_user_id(user)

    if item.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Quantity must be at least 1.", "code": "INVALID_QUANTITY", "quantity": item.quantity},
        )

    variant = await db.variants.find_one({"id": item.variant_id, "is_active": True, "in_stock": True}, {"_id": 0})
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Variant is unavailable or out of stock.",
                "code": "VARIANT_UNAVAILABLE",
                "variant_id": item.variant_id,
            },
        )

    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0}) or {"user_id": user_id, "items": [], "coupon_code": None}
    items = cart.get("items", [])

    existing = next((i for i in items if i["variant_id"] == item.variant_id), None)
    if existing:
        existing["quantity"] += item.quantity
    else:
        items.append(
            {
                "variant_id": item.variant_id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "added_at": datetime.utcnow().isoformat(),
            }
        )

    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": items, "coupon_code": cart.get("coupon_code"), "updated_at": datetime.utcnow().isoformat()}},
        upsert=True,
    )

    return {"success": True}


@router.put("/update")
async def update_quantity(item: CartItem, user: dict = Depends(get_current_user), db=Depends(get_db)):
    user_id = _require_user_id(user)

    if item.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Quantity must be at least 1.", "code": "INVALID_QUANTITY", "quantity": item.quantity},
        )

    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Cart was not found for the authenticated user.", "code": "CART_NOT_FOUND", "user_id": user_id},
        )

    items = cart.get("items", [])
    updated = False
    for cart_item in items:
        if cart_item["variant_id"] == item.variant_id:
            cart_item["quantity"] = item.quantity
            updated = True
            break

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
        {"$set": {"items": items, "updated_at": datetime.utcnow().isoformat()}},
    )
    return {"success": True}


@router.delete("/remove/{variant_id}")
async def remove_item(variant_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    user_id = _require_user_id(user)
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Cart was not found for the authenticated user.", "code": "CART_NOT_FOUND", "user_id": user_id},
        )

    original_items = cart.get("items", [])
    items = [i for i in original_items if i["variant_id"] != variant_id]
    if len(items) == len(original_items):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Variant not found in the authenticated user's cart.",
                "code": "CART_ITEM_NOT_FOUND",
                "variant_id": variant_id,
                "user_id": user_id,
            },
        )

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
        {"$set": {"items": items, "updated_at": datetime.utcnow().isoformat()}},
    )
    return {"success": True}


@router.delete("/")
async def clear_cart(user: dict = Depends(get_current_user), db=Depends(get_db)):
    user_id = _require_user_id(user)
    await db.carts.delete_one({"user_id": user_id})
    return {"success": True}


@router.post("/validate")
async def validate_cart(request: CartValidateRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    _require_user_id(user)

    invalid_items = []
    for item in request.items:
        variant = await db.variants.find_one(
            {"id": item.get("variant_id"), "is_active": True, "in_stock": True},
            {"_id": 0, "id": 1},
        )
        if not variant:
            invalid_items.append({"variant_id": item.get("variant_id"), "reason": "unavailable"})

    return {"invalid_items": invalid_items}
