import os
import requests
import hmac
import hashlib
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List  # ✅ Added List and Dict imports

logger = logging.getLogger(__name__)

# Gokwik Configuration from .env
GOKWIK_MERCHANT_ID = os.getenv("GOKWIK_MERCHANT_ID", "")
GOKWIK_API_KEY = os.getenv("GOKWIK_API_KEY", "")
GOKWIK_SECRET = os.getenv("GOKWIK_SECRET", "")
GOKWIK_API_URL = os.getenv("GOKWIK_API_URL", "https://api.gokwik.co.in/v1")
GOKWIK_CHECKOUT_URL = os.getenv("GOKWIK_CHECKOUT_URL", "https://checkout.gokwik.co.in")

def generate_gokwik_token(payload: Dict[str, Any]) -> str:
    """Generate HMAC SHA256 token for Gokwik API authentication"""
    message = json.dumps(payload, separators=(',', ':'))
    token = hmac.new(
        GOKWIK_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return token

def create_gokwik_order(
    order_id: str,
    order_number: str,
    amount: float,
    customer_details: Dict[str, Any],
    billing_address: Dict[str, Any],
    shipping_address: Dict[str, Any],
    cart_items: List[Dict[str, Any]]  # ✅ Now List is defined
) -> Dict[str, Any]:
    """
    Create order in Gokwik payment gateway
    
    Args:
        order_id: Your internal order ID
        order_number: Your internal order number
        amount: Order amount in rupees
        customer_details: Customer name, email, phone
        billing_address: Billing address details
        shipping_address: Shipping address details
        cart_items: List of items in cart
    
    Returns:
        Gokwik order response with checkout URL
    """
    
    # Convert amount to paise
    amount_paise = int(amount * 100)
    
    # Prepare Gokwik order payload
    payload = {
        "merchant_id": GOKWIK_MERCHANT_ID,
        "merchant_order_id": order_id,
        "order_id": order_number,
        "order_amount": amount_paise,
        "order_currency": "INR",
        "order_date": datetime.now().isoformat(),
        "customer_details": {
            "customer_id": customer_details.get("user_id", ""),
            "customer_email": customer_details.get("email", ""),
            "customer_phone": customer_details.get("phone", ""),
            "customer_name": customer_details.get("name", "")
        },
        "billing_address": {
            "name": billing_address.get("name", ""),
            "address": billing_address.get("address_line1", ""),
            "address2": billing_address.get("address_line2", ""),
            "city": billing_address.get("city", ""),
            "state": billing_address.get("state", ""),
            "pincode": billing_address.get("pincode", ""),
            "country": "India",
            "phone": billing_address.get("phone", ""),
            "email": customer_details.get("email", "")
        },
        "shipping_address": {
            "name": shipping_address.get("name", ""),
            "address": shipping_address.get("address_line1", ""),
            "address2": shipping_address.get("address_line2", ""),
            "city": shipping_address.get("city", ""),
            "state": shipping_address.get("state", ""),
            "pincode": shipping_address.get("pincode", ""),
            "country": "India",
            "phone": shipping_address.get("phone", ""),
            "email": customer_details.get("email", "")
        },
        "cart_items": [
            {
                "item_id": item.get("variant_id", ""),
                "item_name": item.get("product_name", ""),
                "item_quantity": item.get("quantity", 1),
                "item_price": int(item.get("price", 0) * 100),
                "item_total": int(item.get("total", 0) * 100)
            }
            for item in cart_items
        ],
        "redirect_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/payment-callback",
        "callback_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/gokwik/webhook",
        "source": "web"
    }
    
    # Generate token for authentication
    token = generate_gokwik_token(payload)
    
    headers = {
        "Content-Type": "application/json",
        "X-Merchant-ID": GOKWIK_MERCHANT_ID,
        "X-API-Key": GOKWIK_API_KEY,
        "X-Token": token
    }
    
    try:
        response = requests.post(
            f"{GOKWIK_API_URL}/order/create",
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        if result.get("status") == "success":
            return {
                "success": True,
                "gokwik_order_id": result.get("order_id"),
                "checkout_url": result.get("checkout_url"),
                "message": "Order created successfully"
            }
        else:
            logger.error(f"Gokwik order creation failed: {result}")
            return {
                "success": False,
                "error": result.get("message", "Failed to create payment order")
            }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Gokwik API error: {str(e)}")
        return {
            "success": False,
            "error": "Payment gateway error. Please try again."
        }

def verify_gokwik_payment(payload: Dict[str, Any], signature: str) -> bool:
    """Verify Gokwik webhook signature"""
    message = json.dumps(payload, separators=(',', ':'))
    expected_signature = hmac.new(
        GOKWIK_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)

def get_gokwik_payment_status(gokwik_order_id: str) -> Dict[str, Any]:
    """Check payment status from Gokwik"""
    
    headers = {
        "Content-Type": "application/json",
        "X-Merchant-ID": GOKWIK_MERCHANT_ID,
        "X-API-Key": GOKWIK_API_KEY
    }
    
    try:
        response = requests.get(
            f"{GOKWIK_API_URL}/order/status/{gokwik_order_id}",
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to get Gokwik payment status: {str(e)}")
        return {"status": "failed", "message": str(e)}