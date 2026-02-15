from fastapi import HTTPException, Header, Depends
import jwt
import os
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"


# ✅ Database dependency (same pattern as products.py)
async def get_db():
    from db import db
    return db


# ✅ Get current authenticated user
async def get_current_user(
    authorization: str = Header(None),
    db = Depends(get_db)   # 🚀 Proper dependency injection (NO type hint)
):
    """Get current user from JWT token"""

    if not authorization:
        logger.error("❌ No authorization header")
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Extract token from Bearer scheme
        scheme, token = authorization.split()

        if scheme.lower() != "bearer":
            logger.error(f"❌ Invalid auth scheme: {scheme}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Decode JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            logger.error("❌ No user_id in token")
            raise HTTPException(status_code=401, detail="Invalid token")

        # Fetch user from DB
        user = await db.users.find_one(
            {"id": user_id},
            {"_id": 0, "password": 0}
        )

        if not user:
            logger.error(f"❌ User not found: {user_id}")
            raise HTTPException(status_code=401, detail="User not found")

        logger.info(f"✅ User authenticated: {user.get('email')}")
        return user

    except jwt.ExpiredSignatureError:
        logger.error("❌ Token expired")
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError as e:
        logger.error(f"❌ Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

    except Exception as e:
        logger.error(f"❌ Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# ✅ Require admin user
async def require_admin_user(
    authorization: str = Header(None),
    db = Depends(get_db)   # 🚀 Proper dependency injection
):
    """Require admin user"""

    # First validate user normally
    user = await get_current_user(authorization=authorization, db=db)

    if user.get("role") != "admin":
        logger.error(f"❌ User {user.get('email')} is not admin")
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    logger.info(f"✅ Admin authenticated: {user.get('email')}")
    return user
