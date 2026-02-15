from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserCreate, UserLogin, TokenResponse, UserResponse, ChangePasswordRequest, AddAddressRequest
from utils.auth import get_password_hash, verify_password, create_access_token
import uuid
from datetime import datetime, timezone
from fastapi import Header



router = APIRouter(prefix="/auth", tags=["Authentication"])

async def get_db():
    from db import db
    return db

async def get_current_user_dep(
    authorization: str = Header(None)
):
    from middleware.auth_middleware import get_current_user
    from db import db
    return await get_current_user(authorization, db)

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": "user",
        "addresses": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "force_password_change": False
    }
    
    await db.users.insert_one(user_doc)
    token = create_access_token({
    "user_id": user_id,
    "email": user_data.email,
    "role": "user"
})

    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="user",
        addresses=[],
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    token = create_access_token({
    "user_id": user["id"],
    "email": user["email"],
    "role": user.get("role", "user")
})

    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})
    
    return TokenResponse(token=token, user=user_response)

@router.get("/me", response_model=UserResponse)
async def get_me(
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user_data)

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_doc = await db.users.find_one({"id": user["id"]})
    if not verify_password(request.old_password, user_doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    
    new_hash = get_password_hash(request.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash, "force_password_change": False}})
    
    return {"message": "Password changed successfully"}

@router.post("/addresses")
async def add_address(
    address_data: AddAddressRequest,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    address = {"id": str(uuid.uuid4()), **address_data.model_dump()}
    
    if address["is_default"]:
        await db.users.update_one({"id": user["id"]}, {"$set": {"addresses.$[].is_default": False}})
    
    await db.users.update_one({"id": user["id"]}, {"$push": {"addresses": address}})
    
    return {"message": "Address added successfully", "address": address}

@router.delete("/addresses/{address_id}")
async def delete_address(
    address_id: str,
    user: dict = Depends(get_current_user_dep),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"addresses": {"id": address_id}}})
    return {"message": "Address deleted successfully"}
