from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.analytics_service import calculate_analytics_summary
from app.services.scenario_service import calculate_scenario
from app.schemas.analytics import ScenarioRequest, ScenarioResult

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("/calculate", response_model=ScenarioResult)
async def run_scenario_calculation(
    req: ScenarioRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Runs deterministic Python backend calculations for hypothetical What-If scenarios:
    - one_time_purchase: affordability, emergency runway change
    - expense_increase: rent/bill hike impact on savings rate
    - salary_change: raise or pay cut impact on cash flow
    - debt_repayment: lump sum interest saved and debt reduction
    - savings_increase: goal acceleration
    """
    db = DataService(user.id)
    transactions = await db.get_transactions(limit=1000)
    assets = await db.get_assets()
    liabilities = await db.get_liabilities()
    goals = await db.get_goals()

    analytics = calculate_analytics_summary(transactions, assets, liabilities)

    return calculate_scenario(
        scenario_type=req.scenario_type,
        amount=req.amount,
        item_name=req.item_name or "Purchase",
        percentage_change=req.percentage_change,
        analytics=analytics,
        goals=goals
    )
