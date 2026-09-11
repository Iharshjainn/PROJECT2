from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.analytics_service import calculate_analytics_summary
from app.schemas.analytics import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", response_model=AnalyticsSummary)
async def get_analytics(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Computes comprehensive, authoritative financial analytics:
    income, expenses, savings rate, category shares, essential vs discretionary,
    monthly trends, largest expenses, net worth, and debt burden.
    """
    db = DataService(user.id)
    transactions = await db.get_transactions(limit=1000)
    assets = await db.get_assets()
    liabilities = await db.get_liabilities()

    return calculate_analytics_summary(transactions, assets, liabilities)
