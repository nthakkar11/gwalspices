from fastapi import APIRouter, HTTPException, Depends, Header, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.order import CreateOrderRequest, OrderResponse, VerifyPaymentRequest, UpdateOrderStatusRequest
from utils.gokwik_client import create_gokwik_order
from utils.email_service import send_order_confirmation, send_order_status_update, send_admin_order_notification
from utils.invoice_generator import generate_invoice
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])

SKIP_EMAILS = os.getenv("SKIP_EMAILS", "False").lower() == "true"

async def get_db():
    from db import db
    return db

async def get_current_user_dep(authorization: str = None):
    from middleware.auth_middleware import get_current_user
    from db import db
    return await get_current_user(authorization, db)

async def require_admin_user(authorization: str, db):
    from middleware.auth_middleware import require_admin_user
    return await require_admin_user(authorization, db)


# ============================
# CUSTOMER ORDER CREATION
# ============================
# Replace the create_order function with Gokwik version

@router.post("/create")
async def create_order(
    request: CreateOrderRequest,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create order and Gokwik payment order"""
    
    # 1. Get settings
    settings = await db.settings.find_one({"_id": "GLOBAL"}) or {}
    free_shipping_threshold = settings.get("free_shipping_threshold", 999)
    shipping_fee = settings.get("shipping_fee", 129)
    
    # 2. Validate cart items
    validated_items = []
    subtotal = 0
    
    for item in request.items:
        variant = await db.variants.find_one(
            {"id": item.variant_id, "is_active": True},
            {"_id": 0}
        )
        
        if not variant:
            raise HTTPException(
                status_code=400, 
                detail=f"Variant {item.variant_id} not available"
            )
        
        if variant.get("stock", 0) < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {variant.get('size', '')}"
            )
        
        product = await db.products.find_one(
            {"id": variant["product_id"]},
            {"_id": 0, "name": 1, "images": 1}
        )
        
        item_total = variant["selling_price"] * item.quantity
        subtotal += item_total
        
        validated_items.append({
            "product_id": variant["product_id"],
            "variant_id": item.variant_id,
            "product_name": product["name"] if product else "Product",
            "product_image": product.get("images", [{}])[0].get("url", "") if product else "",
            "variant_size": variant.get("size", ""),
            "variant_unit": variant.get("unit", "g"),
            "mrp": variant["mrp"],
            "price": variant["selling_price"],
            "quantity": item.quantity,
            "total": item_total
        })
    
    # 3. COUPON VALIDATION
    discount = 0
    coupon_applied = None
    
    if request.coupon_code:
        code = request.coupon_code.upper().strip()
        coupon = await db.coupons.find_one(
            {"code": code, "active": True},
            {"_id": 0}
        )
        
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        
        expiry = datetime.fromisoformat(coupon["expiry_date"].replace("Z", "+00:00"))
        if expiry <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Coupon has expired")
        
        if subtotal < coupon.get("min_order_amount", 0):
            raise HTTPException(
                status_code=400, 
                detail=f"Add items worth ₹{coupon['min_order_amount'] - subtotal} more to use this coupon"
            )
        
        if coupon.get("usage_limit"):
            if coupon.get("used_count", 0) >= coupon["usage_limit"]:
                raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")
        
        if coupon.get("per_user_limit"):
            user_usage = await db.coupon_usage.count_documents({
                "coupon_id": coupon["id"],
                "user_id": user["id"]
            })
            if user_usage >= coupon["per_user_limit"]:
                raise HTTPException(status_code=400, detail="You have already used this coupon")
        
        if coupon["type"] == "percentage":
            discount = subtotal * (coupon["value"] / 100)
            if coupon.get("max_discount"):
                discount = min(discount, coupon["max_discount"])
        else:
            discount = min(coupon["value"], subtotal)
        
        discount = round(discount, 2)
        
        coupon_applied = {
            "coupon_id": coupon["id"],
            "code": coupon["code"],
            "type": coupon["type"],
            "value": coupon["value"],
            "discount": discount
        }
    
    # 4. Calculate shipping
    shipping_fee_actual = 0 if subtotal >= free_shipping_threshold else shipping_fee
    
    # 5. Calculate total
    total = round(subtotal - discount + shipping_fee_actual, 2)
    
    # 6. Get user address
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "addresses": 1, "email": 1, "name": 1})
    
    if not user_doc or not user_doc.get("addresses"):
        raise HTTPException(status_code=400, detail="No address found")
    
    address = next(
        (addr for addr in user_doc["addresses"] if addr["id"] == request.address_id),
        None
    )
    
    if not address:
        raise HTTPException(status_code=400, detail="Invalid address")
    
    # 7. Generate order ID and number
    order_id = str(uuid.uuid4())
    order_number = f"GWL{datetime.now(timezone.utc).strftime('%y%m%d')}{str(uuid.uuid4())[:8].upper()}"
    
    # 8. Create order document
    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "user_id": user["id"],
        "user_email": user_doc.get("email", ""),
        "user_name": user_doc.get("name", ""),
        "items": validated_items,
        "subtotal": round(subtotal, 2),
        "discount": discount,
        "coupon_applied": coupon_applied,
        "shipping_fee": shipping_fee_actual,
        "total": total,
        "shipping_address": address,
        "payment_method": "gokwik",
        "payment_status": "pending",
        "order_status": "pending_payment",
        "gokwik_order_id": None,
        "gokwik_payment_id": None,
        "invoice_url": None,
        "tracking_number": None,
        "tracking_url": None,
        "courier_name": None,
        "estimated_delivery": None,
        "delivered_at": None,
        "cancelled_at": None,
        "cancellation_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "order_history": [
            {
                "status": "pending_payment",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "Order placed, awaiting payment confirmation"
            }
        ]
    }
    
    await db.orders.insert_one(order_doc)
    
    # 9. Create Gokwik order
    from utils.gokwik_client import create_gokwik_order
    
    customer_details = {
        "user_id": user["id"],
        "name": address["name"],
        "email": user_doc.get("email", ""),
        "phone": address["phone"]
    }
    
    gokwik_response = create_gokwik_order(
        order_id=order_id,
        order_number=order_number,
        amount=total,
        customer_details=customer_details,
        billing_address=address,
        shipping_address=address,
        cart_items=validated_items
    )
    
    if not gokwik_response.get("success"):
        # Delete order if Gokwik fails
        await db.orders.delete_one({"id": order_id})
        raise HTTPException(
            status_code=500,
            detail=gokwik_response.get("error", "Failed to create payment order")
        )
    
    # Update order with Gokwik order ID
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"gokwik_order_id": gokwik_response["gokwik_order_id"]}}
    )
    
    return {
        "order_id": order_id,
        "order_number": order_number,
        "checkout_url": gokwik_response["checkout_url"],
        "amount": total,
        "currency": "INR"
    }

# ============================
# PAYMENT VERIFICATION
# ============================
@router.post("/verify-payment")
async def verify_payment(
    request: VerifyPaymentRequest,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify Razorpay payment and update order with coupon usage tracking."""
    
    # 1. Get order
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if order["payment_status"] == "success":
        raise HTTPException(status_code=400, detail="Payment already verified")
    
    # 2. Verify Razorpay signature
    is_valid = verify_razorpay_signature(
        order["razorpay_order_id"],
        request.razorpay_payment_id,
        request.razorpay_signature
    )
    
    if not is_valid:
        await db.orders.update_one(
            {"id": request.order_id},
            {
                "$set": {
                    "payment_status": "failed",
                    "order_status": "payment_failed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "order_history": {
                        "status": "payment_failed",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "note": "Payment verification failed"
                    }
                }
            }
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # 3. Update order with payment details
    await db.orders.update_one(
        {"id": request.order_id},
        {
            "$set": {
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
                "payment_status": "success",
                "order_status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "order_history": {
                    "status": "processing",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "Payment successful, order is being processed"
                }
            }
        }
    )
    
    # 4. Update inventory
    for item in order["items"]:
        await db.variants.update_one(
            {"id": item["variant_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )
    
    # 5. COUPON USAGE TRACKING - ONLY HERE (when payment is successful)
    if order.get("coupon_applied"):
        coupon = order["coupon_applied"]
        
        await db.coupons.update_one(
            {"id": coupon["coupon_id"]},
            {"$inc": {"used_count": 1}}
        )
        
        await db.coupon_usage.insert_one({
            "id": str(uuid.uuid4()),
            "coupon_id": coupon["coupon_id"],
            "coupon_code": coupon["code"],
            "user_id": user["id"],
            "user_email": order.get("user_email", ""),
            "order_id": request.order_id,
            "order_number": order["order_number"],
            "order_amount": order["subtotal"],
            "discount_amount": coupon["discount"],
            "used_at": datetime.now(timezone.utc).isoformat()
        })
    
    # 6. Generate invoice
    try:
        invoice_url = await generate_invoice(order, request.razorpay_payment_id)
        if invoice_url:
            await db.orders.update_one(
                {"id": request.order_id},
                {"$set": {"invoice_url": invoice_url}}
            )
    except Exception as e:
        logger.error(f"Invoice generation failed: {str(e)}")
    
    # 7. Send email confirmation
    if not SKIP_EMAILS:
        try:
            user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "email": 1})
            if user_doc:
                send_order_confirmation(
                    user_doc["email"],
                    order["order_number"],
                    {
                        "total": order["total"],
                        "subtotal": order["subtotal"],
                        "discount": order["discount"],
                        "shipping_fee": order["shipping_fee"],
                        "items": order["items"],
                        "shipping_address": order["shipping_address"],
                        "coupon_code": order.get("coupon_applied", {}).get("code")
                    }
                )
        except Exception as e:
            logger.error(f"Email sending failed: {str(e)}")
    
    return {
        "success": True, 
        "message": "Payment verified successfully",
        "order_id": order["id"],
        "order_number": order["order_number"]
    }


# ============================
# ADMIN ORDER MANAGEMENT
# ============================
@router.get("/admin")
async def get_all_orders_admin(
    status: Optional[str] = Query(None, description="Filter by order status"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    search: Optional[str] = Query(None, description="Search by order number or customer"),
    from_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date (ISO format)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all orders with filters (admin only)"""
    await require_admin_user(authorization, db)
    
    query = {}
    
    if status:
        query["order_status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}}
        ]
    if from_date or to_date:
        query["created_at"] = {}
        if from_date:
            query["created_at"]["$gte"] = from_date
        if to_date:
            query["created_at"]["$lte"] = to_date
    
    total = await db.orders.count_documents(query)
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "orders": orders,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.put("/admin/{order_id}/status")
async def update_order_status(
    order_id: str,
    request: UpdateOrderStatusRequest,
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update order status with tracking info (admin only)"""
    await require_admin_user(authorization, db)
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    valid_transitions = {
        "pending_payment": ["processing", "cancelled"],
        "processing": ["shipped", "cancelled"],
        "shipped": ["out_for_delivery", "delivered", "cancelled"],
        "out_for_delivery": ["delivered", "cancelled"],
        "delivered": [],
        "cancelled": [],
        "payment_failed": ["pending_payment", "cancelled"]
    }
    
    current_status = order["order_status"]
    new_status = request.status
    
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current_status} to {new_status}"
        )
    
    update_data = {
        "order_status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if request.tracking_number:
        update_data["tracking_number"] = request.tracking_number
        update_data["courier_name"] = request.courier_name
        update_data["tracking_url"] = request.tracking_url
    
    if request.estimated_delivery:
        update_data["estimated_delivery"] = request.estimated_delivery
    
    if new_status == "cancelled" and request.cancellation_reason:
        update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()
        update_data["cancellation_reason"] = request.cancellation_reason
    
    if new_status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "order_history": {
                    "status": new_status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": request.note or f"Order status updated to {new_status}",
                    "tracking_number": request.tracking_number
                }
            }
        }
    )
    
    if not SKIP_EMAILS:
        try:
            if order.get("user_email"):
                send_order_status_update(
                    order["user_email"],
                    order["order_number"],
                    new_status,
                    {
                        "tracking_number": request.tracking_number,
                        "tracking_url": request.tracking_url,
                        "courier_name": request.courier_name,
                        "estimated_delivery": request.estimated_delivery
                    }
                )
        except Exception as e:
            logger.error(f"Status update email failed: {str(e)}")
    
    return {"success": True, "message": f"Order status updated to {new_status}"}


# ============================
# ADMIN DASHBOARD STATS
# ============================
@router.get("/admin/stats")
async def get_order_stats(
    period: str = Query("month", description="day, week, month, year"),
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get REAL order statistics for dashboard"""
    await require_admin_user(authorization, db)
    
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        start_date = (now - timedelta(days=30)).isoformat()
    elif period == "year":
        start_date = (now - timedelta(days=365)).isoformat()
    else:
        start_date = (now - timedelta(days=30)).isoformat()
    
    period_days = 30 if period == "month" else 7 if period == "week" else 1
    prev_start_date = (now - timedelta(days=period_days * 2)).isoformat()
    prev_end_date = (now - timedelta(days=period_days)).isoformat()
    
    # Current period stats
    total_orders = await db.orders.count_documents({"created_at": {"$gte": start_date}})
    
    cod_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "payment_method": "COD"
    })
    
    prepaid_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "payment_method": "razorpay"
    })
    
    pending_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "order_status": {"$in": ["pending_payment", "processing"]}
    })
    
    delivered_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "order_status": "delivered"
    })
    
    cancelled_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "order_status": "cancelled"
    })
    
    shipped_orders = await db.orders.count_documents({
        "created_at": {"$gte": start_date},
        "order_status": {"$in": ["shipped", "out_for_delivery"]}
    })
    
    revenue_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date},
                "payment_status": "success",
                "order_status": {"$ne": "cancelled"}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Previous period stats
    prev_orders = await db.orders.count_documents({
        "created_at": {"$gte": prev_start_date, "$lt": prev_end_date}
    })
    
    prev_revenue_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": prev_start_date, "$lt": prev_end_date},
                "payment_status": "success",
                "order_status": {"$ne": "cancelled"}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    prev_revenue_result = await db.orders.aggregate(prev_revenue_pipeline).to_list(1)
    prev_revenue = prev_revenue_result[0]["total"] if prev_revenue_result else 0
    
    order_growth = ((total_orders - prev_orders) / prev_orders * 100) if prev_orders > 0 else 0
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    delivery_rate = (delivered_orders / total_orders * 100) if total_orders > 0 else 0
    
    # Daily sales for chart
    daily_sales_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": (now - timedelta(days=7)).isoformat()},
                "payment_status": "success",
                "order_status": {"$ne": "cancelled"}
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "sales": {"$sum": "$total"},
                "orders": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    daily_sales = await db.orders.aggregate(daily_sales_pipeline).to_list(7)
    
    return {
        "period": period,
        "total_orders": total_orders,
        "order_growth": round(order_growth, 1),
        "total_revenue": round(total_revenue, 2),
        "revenue_growth": round(revenue_growth, 1),
        "delivery_rate": round(delivery_rate, 1),
        "payment_methods": {
            "cod": cod_orders,
            "prepaid": prepaid_orders,
            "cod_percentage": round((cod_orders / total_orders * 100), 1) if total_orders > 0 else 0,
            "prepaid_percentage": round((prepaid_orders / total_orders * 100), 1) if total_orders > 0 else 0
        },
        "order_status": {
            "pending": pending_orders,
            "delivered": delivered_orders,
            "cancelled": cancelled_orders,
            "shipped": shipped_orders
        },
        "daily_sales": [
            {"date": day["_id"], "sales": day["sales"], "orders": day["orders"]}
            for day in daily_sales
        ]
    }


# ============================
# COUPON STATS FOR DASHBOARD
# ============================
@router.get("/admin/coupon-stats")
async def get_coupon_stats(
    period: str = Query("month", description="day, week, month, year"),
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get REAL coupon usage statistics for dashboard"""
    await require_admin_user(authorization, db)
    
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
    else:
        start_date = (now - timedelta(days=30)).isoformat()
    
    prev_start_date = (now - timedelta(days=60)).isoformat()
    prev_end_date = (now - timedelta(days=30)).isoformat()
    
    total_coupons = await db.coupons.count_documents({})
    active_coupons = await db.coupons.count_documents({"active": True})
    
    usage_pipeline = [
        {"$match": {"used_at": {"$gte": start_date}}},
        {"$group": {"_id": None, "total_uses": {"$sum": 1}, "total_discount": {"$sum": "$discount_amount"}}}
    ]
    usage_result = await db.coupon_usage.aggregate(usage_pipeline).to_list(1)
    total_uses = usage_result[0]["total_uses"] if usage_result else 0
    total_discount = usage_result[0]["total_discount"] if usage_result else 0
    
    prev_usage = await db.coupon_usage.count_documents({
        "used_at": {"$gte": prev_start_date, "$lt": prev_end_date}
    })
    
    usage_growth = ((total_uses - prev_usage) / prev_usage * 100) if prev_usage > 0 else 0
    
    popular_pipeline = [
        {"$match": {"used_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": "$coupon_code",
                "uses": {"$sum": 1},
                "discount": {"$sum": "$discount_amount"},
                "users": {"$addToSet": "$user_id"}
            }
        },
        {"$sort": {"uses": -1}},
        {"$limit": 5}
    ]
    popular_coupons = await db.coupon_usage.aggregate(popular_pipeline).to_list(5)
    
    return {
        "period": period,
        "total_coupons": total_coupons,
        "active_coupons": active_coupons,
        "total_uses": total_uses,
        "total_discount": round(total_discount, 2),
        "usage_growth": round(usage_growth, 1),
        "avg_discount_per_use": round(total_discount / total_uses, 2) if total_uses > 0 else 0,
        "popular_coupons": [
            {
                "code": c["_id"],
                "uses": c["uses"],
                "discount": round(c["discount"], 2),
                "unique_users": len(c.get("users", []))
            }
            for c in popular_coupons
        ]
    }


# ============================
# CUSTOMER ORDER TRACKING
# ============================
@router.get("/track/{order_number}")
async def track_order(
    order_number: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Public order tracking endpoint (no auth required)"""
    
    order = await db.orders.find_one(
        {"order_number": order_number},
        {
            "_id": 0,
            "order_number": 1,
            "order_status": 1,
            "payment_status": 1,
            "tracking_number": 1,
            "tracking_url": 1,
            "courier_name": 1,
            "estimated_delivery": 1,
            "delivered_at": 1,
            "order_history": 1,
            "items": 1,
            "created_at": 1,
            "total": 1,
            "shipping_address": 1
        }
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if "shipping_address" in order:
        order["shipping_address"].pop("phone", None)
    
    return order


@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get authenticated user's orders"""
    orders = await db.orders.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return orders


@router.get("/{order_id}")
async def get_order_details(
    order_id: str,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get specific order details for authenticated user"""
    order = await db.orders.find_one(
        {"id": order_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order