from datetime import datetime
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase


class PricingError(Exception):
    pass


async def calculate_checkout(
    db: AsyncIOMotorDatabase,
    user_id: Optional[str],
    cart_items: List[dict],
    payment_method: Optional[str] = None,
    coupon_code: Optional[str] = None,
):
    """
    cart_items format:
    [
        {
            "variant_id": str,
            "quantity": int
        }
    ]
    """

    if not cart_items:
        raise PricingError("Cart is empty")

    # ============================================
    # 1️⃣ FETCH GLOBAL SETTINGS (SAFE FALLBACK)
    # ============================================
    settings = await db.settings.find_one({"_id": "GLOBAL"})

    shipping_threshold = 599
    shipping_fee = 129
    cod_fee = 149
    prepaid_discount_1 = 5
    prepaid_discount_2 = 5
    prepaid_threshold_2 = 1199

    if settings:
        shipping_threshold = settings.get("shipping_threshold", 599)
        shipping_fee = settings.get("shipping_fee", 129)
        cod_fee = settings.get("cod_fee", 149)
        prepaid_discount_1 = settings.get("prepaid_discount_1", 5)
        prepaid_discount_2 = settings.get("prepaid_discount_2", 5)
        prepaid_threshold_2 = settings.get("prepaid_threshold_2", 1199)

    # ============================================
    # 2️⃣ CALCULATE SUBTOTAL
    # ============================================
    subtotal = 0
    total_mrp = 0

    detailed_items = []

    for item in cart_items:
        variant = await db.variants.find_one(
            {
                "id": item["variant_id"],
                "is_active": True,
                "in_stock": True
            },
            {"_id": 0}
        )

        if not variant:
            raise PricingError("One of the items is unavailable")

        qty = item["quantity"]

        subtotal += variant["selling_price"] * qty
        total_mrp += variant["mrp"] * qty

        detailed_items.append({
            "variant_id": variant["id"],
            "mrp": variant["mrp"],
            "selling_price": variant["selling_price"],
            "quantity": qty
        })

    # ============================================
    # 3️⃣ SHIPPING LOGIC
    # ============================================
    shipping_charge = 0 if subtotal >= shipping_threshold else shipping_fee

    # ============================================
    # 4️⃣ PREPAID / COD LOGIC
    # ============================================
    prepaid_discount = 0
    cod_charge = 0
    high_value_discount = 0

    if payment_method == "PREPAID":
        prepaid_discount = subtotal * (prepaid_discount_1 / 100)

        if subtotal >= prepaid_threshold_2:
            high_value_discount = subtotal * (prepaid_discount_2 / 100)

    if payment_method == "COD":
        cod_charge = cod_fee

    # ============================================
    # 5️⃣ COUPON LOGIC
    # ============================================
    coupon_discount = 0
    coupon_data = None

    if coupon_code:
        coupon = await db.coupons.find_one(
            {
                "code": coupon_code,
                "active": True
            },
            {"_id": 0}
        )

        if not coupon:
            raise PricingError("Invalid coupon code")

        expiry = datetime.fromisoformat(coupon["expiry_date"])

        if expiry < datetime.utcnow():
            raise PricingError("Coupon expired")

        if subtotal < coupon.get("min_order_amount", 0):
            raise PricingError("Minimum order amount not met")

        if coupon["type"] == "percentage":
            coupon_discount = subtotal * (coupon["value"] / 100)
        else:
            coupon_discount = coupon["value"]

        if coupon.get("max_discount"):
            coupon_discount = min(coupon_discount, coupon["max_discount"])

        coupon_data = {
            "code": coupon["code"],
            "discount": round(coupon_discount, 2)
        }

    # ============================================
    # 6️⃣ TOTAL CALCULATION
    # ============================================
    total_discount = prepaid_discount + high_value_discount + coupon_discount

    grand_total = (
        subtotal
        - total_discount
        + shipping_charge
        + cod_charge
    )

    if grand_total < 0:
        grand_total = 0

    # ============================================
    # 7️⃣ PROGRESS INDICATORS
    # ============================================
    remaining_for_free_shipping = max(0, shipping_threshold - subtotal)
    remaining_for_high_value = max(0, prepaid_threshold_2 - subtotal)

    # ============================================
    # 8️⃣ RESPONSE STRUCTURE (FRONTEND READY)
    # ============================================
    return {
        "items": detailed_items,
        "subtotal": round(subtotal, 2),
        "mrp_total": round(total_mrp, 2),
        "discounts": {
            "prepaid_discount": round(prepaid_discount, 2),
            "high_value_discount": round(high_value_discount, 2),
            "coupon_discount": round(coupon_discount, 2),
            "total_discount": round(total_discount, 2)
        },
        "charges": {
            "shipping": round(shipping_charge, 2),
            "cod_fee": round(cod_charge, 2)
        },
        "grand_total": round(grand_total, 2),
        "progress": {
            "remaining_for_free_shipping": round(remaining_for_free_shipping, 2),
            "remaining_for_high_value_discount": round(remaining_for_high_value, 2)
        },
        "coupon": coupon_data,
        "tax_note": "Inclusive of all taxes"
    }
