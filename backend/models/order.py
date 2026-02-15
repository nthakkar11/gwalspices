from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class OrderItem(BaseModel):
    product_id: str
    variant_id: str
    product_name: str
    variant_size: str
    price: float
    quantity: int
    total: float

class ShippingAddress(BaseModel):
    id: str
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: Optional[bool] = False

class CouponApplied(BaseModel):
    coupon_id: str
    code: str
    type: str
    value: float
    discount: float

class OrderHistory(BaseModel):
    status: str
    timestamp: str
    note: Optional[str] = None
    tracking_number: Optional[str] = None

class CreateOrderRequest(BaseModel):
    items: List[Dict[str, Any]]
    address_id: str
    coupon_code: Optional[str] = None
    payment_method: str = "razorpay"

class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class UpdateOrderStatusRequest(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery: Optional[str] = None
    cancellation_reason: Optional[str] = None
    note: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = [
            'pending_payment', 'processing', 'shipped', 
            'out_for_delivery', 'delivered', 'cancelled'
        ]
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of {valid_statuses}')
        return v

class OrderTrackingRequest(BaseModel):
    order_number: str

class OrderResponse(BaseModel):
    id: str
    order_number: str
    user_id: str
    items: List[OrderItem]
    subtotal: float
    discount: float
    coupon_applied: Optional[CouponApplied]
    shipping_fee: float
    total: float
    shipping_address: ShippingAddress
    payment_method: str
    payment_status: str
    order_status: str
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    invoice_url: Optional[str]
    tracking_number: Optional[str]
    tracking_url: Optional[str]
    courier_name: Optional[str]
    estimated_delivery: Optional[str]
    delivered_at: Optional[str]
    cancelled_at: Optional[str]
    cancellation_reason: Optional[str]
    created_at: str
    updated_at: str
    order_history: List[OrderHistory]