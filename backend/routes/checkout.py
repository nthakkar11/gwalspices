from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/checkout", tags=["Checkout"])
logger = logging.getLogger(__name__)


# ==============================
# DATABASE DEPENDENCY
# ==============================
async def get_db():
    from db import db
    return db


# ==============================
# REQUEST MODEL
# ==============================
class CheckoutPreviewRequest(BaseModel):
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = None  # "COD" or "PREPAID"


# ==============================
# CHECKOUT PREVIEW (BUSINESS LOGIC PRESERVED)
# ==============================
@router.post("/preview")
async def preview_checkout(
    request: CheckoutPreviewRequest,
    user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Production-grade checkout preview.
    Business rules preserved exactly as original.
    Cart is read from DB (source of truth).
    """

    try:
        # =====================================
        # 1️⃣ FETCH CART FROM DATABASE
        # =====================================
        cart = await db.carts.find_one({"user_id": user["id"]})

        if not cart or not cart.get("items"):
            raise HTTPException(status_code=400, detail="Cart is empty")

        cart_items = cart["items"]

        # =====================================
        # 2️⃣ FETCH VALID VARIANTS
        # =====================================
        variant_ids = [item["variant_id"] for item in cart_items]

        variants = await db.variants.find({
            "id": {"$in": variant_ids},
            "is_active": True,
            "in_stock": True
        }).to_list(length=len(variant_ids))

        variant_map = {v["id"]: v for v in variants}

        # =====================================
        # 3️⃣ CALCULATE SUBTOTAL
        # =====================================
        subtotal = 0
        detailed_items = []

        for item in cart_items:
            variant = variant_map.get(item["variant_id"])

            if not variant:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item {item['variant_id']} is unavailable"
                )

            product = await db.products.find_one(
                {
                    "id": variant.get("product_id"),
                    "is_active": True
                },
                {"_id": 0, "name": 1, "image_urls": 1}
            )

            if not product:
                raise HTTPException(
                    status_code=400,
                    detail="Product unavailable"
                )

            quantity = max(1, item["quantity"])
            price = variant.get("selling_price", 0)
            mrp = variant.get("mrp", price)

            subtotal += price * quantity

            detailed_items.append({
                "variant_id": variant["id"],
                "product_name": product.get("name", "Product"),
                "image": product.get("image_urls", [""])[0] if product.get("image_urls") else "",
                "mrp": mrp,
                "price": price,
                "quantity": quantity,
                "variant_size": variant.get("size", ""),
                "variant_unit": variant.get("unit", "g")
            })

        subtotal = round(subtotal, 2)

        # =====================================
        # 4️⃣ FETCH GLOBAL SETTINGS
        # =====================================
        settings = await db.settings.find_one({"_id": "GLOBAL"}) or {}

        free_shipping_threshold = settings.get("free_shipping_threshold", 599)
        shipping_fee = settings.get("shipping_fee", 129)
        cod_fee = settings.get("cod_fee", 149)
        prepaid_discount_percent = settings.get("prepaid_discount", 5)

        # =====================================
        # 5️⃣ SHIPPING CALCULATION
        # =====================================
        delivery_fee = 0 if subtotal >= free_shipping_threshold else shipping_fee

        # =====================================
        # 6️⃣ COUPON LOGIC (NO MINIMUM ORDER FOR SYSTEM)
        # =====================================
        discount = 0
        coupon_data = None

        if request.coupon_code and request.coupon_code.strip():
            coupon_code = request.coupon_code.strip().upper()

            coupon = await db.coupons.find_one({
                "code": coupon_code,
                "active": True
            })

            if not coupon:
                raise HTTPException(status_code=400, detail="Invalid coupon code")

            # Expiry check
            try:
                expiry = datetime.fromisoformat(
                    coupon["expiry_date"].replace("Z", "+00:00")
                )
                if expiry <= datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Coupon expired")
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid coupon expiry date")

            # Usage limit
            if coupon.get("usage_limit"):
                if coupon.get("used_count", 0) >= coupon["usage_limit"]:
                    raise HTTPException(status_code=400, detail="Coupon usage limit exceeded")

            # Discount calculation
            if coupon["type"] == "percentage":
                discount = subtotal * (coupon["value"] / 100)
                if coupon.get("max_discount"):
                    discount = min(discount, coupon["max_discount"])
            else:
                discount = min(coupon["value"], subtotal)

            discount = round(discount, 2)

            coupon_data = {
                "code": coupon["code"],
                "discount": discount,
                "type": coupon["type"],
                "value": coupon["value"]
            }

        # =====================================
        # 7️⃣ PAYMENT METHOD CALCULATIONS
        # =====================================
        prepaid_discount = 0
        cod_charge = 0

        if request.payment_method == "PREPAID":
            prepaid_discount = round(
                subtotal * (prepaid_discount_percent / 100),
                2
            )
        elif request.payment_method == "COD":
            cod_charge = cod_fee

        # =====================================
        # 8️⃣ FINAL CALCULATION
        # =====================================
        total_discount = discount + prepaid_discount
        grand_total = round(
            subtotal - total_discount + delivery_fee + cod_charge,
            2
        )

        remaining_for_free_shipping = max(0, free_shipping_threshold - subtotal)

        # =====================================
        # 9️⃣ RESPONSE
        # =====================================
        return {
            "items": detailed_items,
            "subtotal": subtotal,
            "discount": discount,
            "coupon": coupon_data,
            "charges": {
                "shipping": delivery_fee,
                "cod_fee": cod_charge
            },
            "discounts": {
                "coupon_discount": discount,
                "prepaid_discount": prepaid_discount,
                "total_discount": total_discount
            },
            "grand_total": grand_total,
            "progress": {
                "remaining_for_free_shipping": round(remaining_for_free_shipping, 2)
            },
            "payment_method": request.payment_method,
            "message": "Pricing calculated successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Unexpected error in preview_checkout: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Unable to calculate pricing. Please try again."
        )
