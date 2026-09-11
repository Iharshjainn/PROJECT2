from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.schemas.models import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/profile", response_model=Dict[str, Any])
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
    db = DataService(user.id)
    return await db.get_or_create_profile(email=user.email)

@router.put("/profile", response_model=Dict[str, Any])
async def update_profile(
    updates: ProfileUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    upd_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    return await db.update_profile(upd_data)
