from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.schemas.models import LiabilityCreate, LiabilityUpdate, LiabilityResponse

router = APIRouter(prefix="/liabilities", tags=["Liabilities"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_liabilities(user: AuthenticatedUser = Depends(get_current_user)):
    db = DataService(user.id)
    return await db.get_liabilities()

@router.post("", response_model=Dict[str, Any])
async def create_liability(
    liab: LiabilityCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    return await db.create_liability(liab.model_dump())

@router.put("/{liability_id}", response_model=Dict[str, Any])
async def update_liability(
    liability_id: str,
    liab: LiabilityUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    updates = {k: v for k, v in liab.model_dump().items() if v is not None}
    res = await db.update_liability(liability_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Liability not found or unauthorized")
    return res

@router.delete("/{liability_id}")
async def delete_liability(
    liability_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    success = await db.delete_liability(liability_id)
    if not success:
        raise HTTPException(status_code=404, detail="Liability not found or unauthorized")
    return {"message": "Liability deleted successfully"}
