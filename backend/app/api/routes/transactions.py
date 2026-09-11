from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.categorization_service import categorize_transaction
from app.schemas.models import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_transactions(
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    account_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists transactions scoped to the authenticated user with filtering and search."""
    db = DataService(user.id)
    return await db.get_transactions(
        category=category,
        transaction_type=transaction_type,
        account_id=account_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        limit=limit,
        offset=offset
    )

@router.post("", response_model=Dict[str, Any])
async def create_transaction(
    tx: TransactionCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a manual transaction with deterministic categorization and merchant detection."""
    db = DataService(user.id)
    data = tx.model_dump()
    
    # If category not manually changed or is default, auto-categorize
    if not data.get("category") or data.get("category") == "Other":
        cat, subcat, merch = categorize_transaction(data["description"], data["amount"], data["transaction_type"])
        data["category"] = cat
        if subcat:
            data["subcategory"] = subcat
        if merch and not data.get("merchant"):
            data["merchant"] = merch

    return await db.create_transaction(data)

@router.put("/{tx_id}", response_model=Dict[str, Any])
async def update_transaction(
    tx_id: str,
    tx: TransactionUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates an existing transaction owned by the authenticated user."""
    db = DataService(user.id)
    updates = {k: v for k, v in tx.model_dump().items() if v is not None}
    res = await db.update_transaction(tx_id, updates)
    if not res:
        raise HTTPException(status_code=404, detail="Transaction not found or unauthorized")
    return res

@router.delete("/{tx_id}")
async def delete_transaction(
    tx_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a transaction owned by the authenticated user."""
    db = DataService(user.id)
    success = await db.delete_transaction(tx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found or unauthorized")
    return {"message": "Transaction deleted successfully"}
