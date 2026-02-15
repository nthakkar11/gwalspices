from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, timezone
import re

class CouponBase(BaseModel):
    code: str
    type: str  # percentage or flat
    value: float = Field(gt=0)
    min_order_amount: float = Field(default=0, ge=0)
    max_discount: Optional[float] = Field(default=None, gt=0)
    expiry_date: str
    usage_limit: Optional[int] = Field(default=None, gt=0)
    per_user_limit: Optional[int] = Field(default=None, gt=0)
    active: bool = True
    description: Optional[str] = None
    
    @validator('code')
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError('Coupon code is required')
        # Only allow alphanumeric and underscore
        if not re.match(r'^[A-Z0-9_]+$', v.upper()):
            raise ValueError('Coupon code must contain only letters, numbers and underscore')
        return v.upper()
    
    @validator('type')
    def validate_type(cls, v):
        if v not in ['percentage', 'flat']:
            raise ValueError('Type must be "percentage" or "flat"')
        return v
    
    @validator('expiry_date')
    def validate_expiry(cls, v):
        try:
            # Handle ISO format with/without Z
            expiry = datetime.fromisoformat(v.replace('Z', '+00:00'))
            if expiry <= datetime.now(timezone.utc):
                raise ValueError('Expiry date must be in the future')
            return v
        except Exception:
            raise ValueError('Invalid expiry date format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)')

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = Field(default=None, gt=0)
    min_order_amount: Optional[float] = Field(default=None, ge=0)
    max_discount: Optional[float] = Field(default=None, gt=0)
    expiry_date: Optional[str] = None
    usage_limit: Optional[int] = Field(default=None, gt=0)
    per_user_limit: Optional[int] = Field(default=None, gt=0)
    active: Optional[bool] = None
    description: Optional[str] = None

class CouponResponse(CouponBase):
    id: str
    used_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

class ValidateCouponRequest(BaseModel):
    code: str
    cart_subtotal: float = Field(ge=0)
    user_id: Optional[str] = None  # For per-user limits

class ValidateCouponResponse(BaseModel):
    valid: bool
    discount: float = 0
    message: str
    coupon_code: Optional[str] = None