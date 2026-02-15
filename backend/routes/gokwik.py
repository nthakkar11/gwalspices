from fastapi import APIRouter, HTTPException, Request, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
import logging
from typing import Dict, Any
from utils.gokwik_client import verify_gokwik_payment, create_gokwik_order
from utils.email_service import send_order_confirmation
from utils.invoice_generator import generate_invoice

router = APIRouter(prefix="/gokwik", tags=["Gokwik"])
logger = logging.getLogger(__name__)

async def get_db():
    from db import db
    return db

@router.post("/webhook")
async def gokwik_webhook(
    request: Request,
    x_token: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Gokwik payment webhook handler
    Called by Gokwik when payment status changes
    """
    
    try:
        payload = await request.json()
        
        # Verify webhook signature
        if not verify_gokwik_payment(payload, x_token):
            logger.error("Invalid Gokwik webhook signature")
            return {"status": "error", "message": "Invalid signature"}
        
        # Extract payment details
        merchant_order_id = payload.get("merchant_order_id")  # Your internal order ID
        gokwik_order_id = payload.get("order_id")
        payment_status = payload.get("payment_status")
        payment_id = payload.get("payment_id")
        
        # Get order from database
        order = await db.orders.find_one({"id": merchant_order_id}, {"_id": 0})
        if not order:
            logger.error(f"Order not found: {merchant_order_id}")
            return {"status": "error", "message": "Order not found"}
        
        # Update order based on payment status
        if payment_status == "success":
            # Update order status
            await db.orders.update_one(
                {"id": merchant_order_id},
                {
                    "$set": {
                        "payment_status": "success",
                        "order_status": "processing",
                        "gokwik_order_id": gokwik_order_id,
                        "gokwik_payment_id": payment_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$push": {
                        "order_history": {
                            "status": "processing",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "note": "Payment successful via Gokwik"
                        }
                    }
                }
            )
            
            # Update inventory
            for item in order["items"]:
                await db.variants.update_one(
                    {"id": item["variant_id"]},
                    {"$inc": {"stock": -item["quantity"]}}
                )
            
            # Track coupon usage
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
                    "user_id": order["user_id"],
                    "user_email": order.get("user_email", ""),
                    "order_id": merchant_order_id,
                    "order_number": order["order_number"],
                    "order_amount": order["subtotal"],
                    "discount_amount": coupon["discount"],
                    "used_at": datetime.now(timezone.utc).isoformat()
                })
            
            # Generate invoice
            try:
                invoice_url = await generate_invoice(order, payment_id)
                if invoice_url:
                    await db.orders.update_one(
                        {"id": merchant_order_id},
                        {"$set": {"invoice_url": invoice_url}}
                    )
            except Exception as e:
                logger.error(f"Invoice generation failed: {str(e)}")
            
            # Send email confirmation
            try:
                if order.get("user_email"):
                    send_order_confirmation(
                        order["user_email"],
                        order["order_number"],
                        order
                    )
            except Exception as e:
                logger.error(f"Email sending failed: {str(e)}")
            
            return {"status": "success", "message": "Payment verified"}
            
        elif payment_status == "failed":
            await db.orders.update_one(
                {"id": merchant_order_id},
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
                            "note": f"Payment failed: {payload.get('failure_reason', 'Unknown error')}"
                        }
                    }
                }
            )
            return {"status": "success", "message": "Payment failure recorded"}
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Gokwik webhook error: {str(e)}")
        return {"status": "error", "message": "Webhook processing failed"}

@router.get("/payment-callback")
async def payment_callback(
    order_id: str,
    status: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Handle redirect from Gokwik checkout"""
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"error": "Order not found"}
    
    if status == "success":
        return {"redirect": f"/order-success/{order_id}"}
    else:
        return {"redirect": f"/payment-failed/{order_id}"}