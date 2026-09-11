from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.analytics_service import calculate_analytics_summary
from app.services.financial_health_service import calculate_financial_health_score
from app.schemas.analytics import FinancialHealthResponse

router = APIRouter(prefix="/financial-health", tags=["Financial Health"])

@router.get("", response_model=FinancialHealthResponse)
async def get_financial_health(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns transparent 0-100 financial health wellness score,
    5 component pillar breakdowns, positive drivers, areas for improvement,
    and concrete recommendations.
    """
    db = DataService(user.id)
    transactions = await db.get_transactions(limit=1000)
    assets = await db.get_assets()
    liabilities = await db.get_liabilities()

    analytics = calculate_analytics_summary(transactions, assets, liabilities)
    return calculate_financial_health_score(analytics)
