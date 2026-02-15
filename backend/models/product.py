from pydantic import BaseModel, Field
from typing import List, Optional

class VariantBase(BaseModel):
    size: str                 # 100g, 250g
    mrp: float                # original price
    selling_price: float      # final price after discount
    discount_percent: float = 0.0
    sku: str
    is_active: bool = True
    in_stock: bool = True

class VariantCreate(VariantBase):
    product_id: str

class VariantResponse(VariantBase):
    id: str
    product_id: str

class ProductBase(BaseModel):
    name: str
    slug: str
    description: str
    category: str
    image_urls: List[str] = []
    nutritional_info: Optional[str] = ""
    benefits: List[str] = []
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    created_at: str
    updated_at: str

class ProductWithVariants(ProductResponse):
    variants: List[VariantResponse] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
    is_active: Optional[bool] = None

