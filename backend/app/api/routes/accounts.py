from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.schemas.models import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_accounts(user: AuthenticatedUser = Depends(get_current_user)):
    db = DataService(user.id)
    return await db.get_accounts()

@router.post("", response_model=Dict[str, Any])
async def create_account(
    acct: AccountCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    return await db.create_account(acct.model_dump())

@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    db = DataService(user.id)
    success = await db.delete_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found or unauthorized")
    return {"message": "Account deleted successfully"}
