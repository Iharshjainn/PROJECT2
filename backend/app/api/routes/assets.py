from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.schemas.models import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_assets(user: AuthenticatedUser = Depends(get_current_user)):
    db = DataService(user.id)
    return await db.get_assets()

@router.post("", response_model=Dict[str, Any])
async def create_asset(
    asset: AssetCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    return await db.create_asset(asset.model_dump())

@router.put("/{asset_id}", response_model=Dict[str, Any])
async def update_asset(
    asset_id: str,
    asset: AssetUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    updates = {k: v for k, v in asset.model_dump().items() if v is not None}
    res = await db.update_asset(asset_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Asset not found or unauthorized")
    return res

@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    success = await db.delete_asset(asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found or unauthorized")
    return {"message": "Asset deleted successfully"}
