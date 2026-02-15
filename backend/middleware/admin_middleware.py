from fastapi import Header, HTTPException

async def require_admin(authorization: str = Header(None)):
    if authorization != "Bearer admin-token":
        raise HTTPException(status_code=403, detail="Admin access denied")
    return True
