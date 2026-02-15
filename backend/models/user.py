from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class Address(BaseModel):
    id: str
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    addresses: List[Address] = []
    created_at: str
    force_password_change: bool = False

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class AddAddressRequest(BaseModel):
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False
