from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime

class Settings(BaseModel):
    id: str = "global_settings"
    global_discount_enabled: bool = False
    global_discount_percent: float = 0.0

    banner_enabled: bool = False
    banner_image_url: Optional[str] = None

    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ======================================================
# UPDATE REQUEST MODEL (USED BY ADMIN ROUTES)
# ======================================================

class UpdateSettingsRequest(BaseModel):
    global_discount_enabled: Optional[bool] = None
    global_discount_percent: Optional[float] = None
    banner_enabled: Optional[bool] = None
    banner_image_url: Optional[str] = None



class GlobalSettings(BaseModel):
    shipping_threshold: int = 599
    shipping_fee: int = 129
    cod_fee: int = 149

    prepaid_discount_1: int = 5
    prepaid_discount_2: int = 5
    prepaid_threshold_2: int = 1199

    enabled_states: Dict[str, bool]  # 🔥 NEW
