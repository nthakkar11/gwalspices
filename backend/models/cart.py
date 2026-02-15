from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CartItem(BaseModel):
    variant_id: str
    product_id: str
    quantity: int
    added_at: Optional[str] = None

class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = Field(default_factory=list)
    coupon_code: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CartInDB(Cart):
    id: str
