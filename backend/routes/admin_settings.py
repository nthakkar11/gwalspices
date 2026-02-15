from fastapi import APIRouter
from middleware.admin_middleware import admin_required
from db import db
from datetime import datetime

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


@router.post("/states")
@admin_required
def update_states(states: list[str]):
    db.settings.update_one(
        {"_id": "GLOBAL"},
        {
            "$set": {
                "enabled_states": states,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return {"success": True}
