from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import uuid4

class CouponUsageBase(BaseModel):
    coupon_id: str
    coupon_code: str
    user_id: str
    user_email: Optional[str] = None
    order_id: str
    order_amount: float
    discount_amount: float

class CouponUsageCreate(CouponUsageBase):
    pass

class CouponUsageResponse(CouponUsageBase):
    id: str
    used_at: str
    
class CouponUsageStats(BaseModel):
    coupon_id: str
    coupon_code: str
    total_uses: int
    total_discount: float
    unique_users: int
    last_used: Optional[str] = None