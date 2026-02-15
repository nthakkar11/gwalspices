from fastapi import APIRouter, Depends, HTTPException, Header, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, List

from middleware.auth_middleware import require_admin_user
from models.coupon import CouponBase, CouponCreate, CouponUpdate, CouponResponse, ValidateCouponRequest, ValidateCouponResponse

router = APIRouter(prefix="/coupons", tags=["Coupons"])

# =========================
# DB DEPENDENCY
# =========================
async def get_db():
    from db import db
    return db

# =========================
# ADMIN ROUTES
# =========================

@router.get("/admin", response_model=List[CouponResponse])
async def get_all_coupons(
    active_only: bool = Query(False, description="Filter only active coupons"),
    include_expired: bool = Query(False, description="Include expired coupons"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all coupons (admin only)"""
    
    
    query = {}
    
    if active_only:
        query["active"] = True
    
    if not include_expired:
        now = datetime.now(timezone.utc).isoformat()
        query["expiry_date"] = {"$gt": now}
    
    cursor = db.coupons.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
    coupons = await cursor.to_list(limit)
    
    return coupons

@router.post("/admin", response_model=CouponResponse)
async def create_coupon(
    payload: CouponCreate,
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new coupon (admin only)"""
    
    
    # Check if coupon already exists
    existing = await db.coupons.find_one({"code": payload.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    # Create coupon document
    now = datetime.now(timezone.utc)
    coupon_data = payload.model_dump()
    coupon_data.update({
        "id": str(uuid4()),
        "code": payload.code.upper(),
        "used_count": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })
    
    await db.coupons.insert_one(coupon_data)
    
    # Remove _id for response
    coupon_data.pop("_id", None)
    
    return coupon_data

@router.get("/admin/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: str,
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get a specific coupon by ID (admin only)"""
    
    
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return coupon

@router.put("/admin/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    payload: CouponUpdate,
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a coupon (admin only)"""
    
    
    # Check if coupon exists
    existing = await db.coupons.find_one({"id": coupon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Prepare update data
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    
    # If code is being updated, check for duplicates
    if "code" in update_data:
        new_code = update_data["code"].upper()
        duplicate = await db.coupons.find_one({
            "code": new_code,
            "id": {"$ne": coupon_id}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
        update_data["code"] = new_code
    
    # Add updated timestamp
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.coupons.update_one(
        {"id": coupon_id},
        {"$set": update_data}
    )
    
    updated = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    return updated

@router.delete("/admin/{coupon_id}")
async def delete_coupon(
    coupon_id: str,
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a coupon (soft delete by default, permanent with ?permanent=true)"""
    
    
    if permanent:
        result = await db.coupons.delete_one({"id": coupon_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return {"success": True, "message": "Coupon permanently deleted"}
    else:
        result = await db.coupons.update_one(
            {"id": coupon_id},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return {"success": True, "message": "Coupon deactivated"}

@router.put("/admin/{coupon_id}/toggle")
async def toggle_coupon(
    coupon_id: str,
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggle coupon active status"""
    
    
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    new_status = not coupon.get("active", True)
    
    await db.coupons.update_one(
        {"id": coupon_id},
        {"$set": {
            "active": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"active": new_status}

# =========================
# CUSTOMER ROUTES
# =========================

@router.get("/active")
async def get_active_coupons(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all active and valid coupons for customers"""
    now = datetime.now(timezone.utc).isoformat()
    
    coupons = await db.coupons.find(
        {
            "active": True,
            "expiry_date": {"$gt": now}
        },
        {
            "_id": 0,
            "code": 1,
            "type": 1,
            "value": 1,
            "min_order_amount": 1,
            "max_discount": 1,
            "description": 1,
            "expiry_date": 1
        }
    ).sort("created_at", -1).to_list(50)
    
    return coupons

@router.post("/validate", response_model=ValidateCouponResponse)
async def validate_coupon(
    request: ValidateCouponRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Validate a coupon and calculate discount"""
    
    # Find coupon
    coupon = await db.coupons.find_one(
        {"code": request.code.upper(), "active": True}
    )
    
    if not coupon:
        return ValidateCouponResponse(
            valid=False,
            discount=0,
            message="Invalid coupon code"
        )
    
    # Check expiry
    expiry = datetime.fromisoformat(coupon["expiry_date"].replace("Z", "+00:00"))
    if expiry <= datetime.now(timezone.utc):
        return ValidateCouponResponse(
            valid=False,
            discount=0,
            message="Coupon has expired"
        )
    
    # Check minimum order
    if request.cart_subtotal < coupon.get("min_order_amount", 0):
        return ValidateCouponResponse(
            valid=False,
            discount=0,
            message=f"Minimum order amount ₹{coupon['min_order_amount']} required"
        )
    
    # Check global usage limit
    if coupon.get("usage_limit") and coupon["used_count"] >= coupon["usage_limit"]:
        return ValidateCouponResponse(
            valid=False,
            discount=0,
            message="Coupon usage limit exceeded"
        )
    
    # Check per-user limit
    if request.user_id and coupon.get("per_user_limit"):
        user_usage = await db.coupon_usage.count_documents({
            "coupon_id": coupon["id"],
            "user_id": request.user_id
        })
        if user_usage >= coupon["per_user_limit"]:
            return ValidateCouponResponse(
                valid=False,
                discount=0,
                message="You have already used this coupon"
            )
    
    # Calculate discount
    if coupon["type"] == "percentage":
        discount = request.cart_subtotal * (coupon["value"] / 100)
        if coupon.get("max_discount"):
            discount = min(discount, coupon["max_discount"])
    else:
        discount = min(coupon["value"], request.cart_subtotal)  # Can't discount more than subtotal
    
    discount = round(discount, 2)
    
    return ValidateCouponResponse(
        valid=True,
        discount=discount,
        message="Coupon applied successfully",
        coupon_code=coupon["code"]
    )

@router.post("/apply")
async def apply_coupon(
    request: ValidateCouponRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Apply coupon to cart (for checkout flow)"""
    validation = await validate_coupon(request, db)
    
    if not validation.valid:
        raise HTTPException(status_code=400, detail=validation.message)
    
    return {
        "success": True,
        "discount": validation.discount,
        "coupon_code": request.code.upper(),
        "message": "Coupon applied successfully"
    }

@router.get("/admin/stats")
async def get_coupon_stats(
    admin_user: dict = Depends(require_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get coupon usage statistics for dashboard"""
    
    
    # Get total coupons count
    total_coupons = await db.coupons.count_documents({})
    active_coupons = await db.coupons.count_documents({"active": True})
    
    # Get coupon usage stats
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_usage": {"$sum": 1},
                "total_discount": {"$sum": "$discount_amount"}
            }
        }
    ]
    
    usage_stats = await db.coupon_usage.aggregate(pipeline).to_list(1)
    
    total_usage = usage_stats[0]["total_usage"] if usage_stats else 0
    total_discount = usage_stats[0]["total_discount"] if usage_stats else 0
    
    # Get popular coupons
    popular_pipeline = [
        {
            "$group": {
                "_id": "$coupon_code",
                "uses": {"$sum": 1},
                "discount": {"$sum": "$discount_amount"}
            }
        },
        {"$sort": {"uses": -1}},
        {"$limit": 5}
    ]
    
    popular_coupons = await db.coupon_usage.aggregate(popular_pipeline).to_list(5)
    
    return {
        "total_coupons": total_coupons,
        "active_coupons": active_coupons,
        "total_usage": total_usage,
        "total_discount": round(total_discount, 2),
        "popular_coupons": [
            {
                "code": c["_id"],
                "uses": c["uses"],
                "discount": round(c["discount"], 2)
            }
            for c in popular_coupons
        ]
    }