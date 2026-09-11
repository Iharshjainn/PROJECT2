from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.analytics_service import calculate_analytics_summary
from app.services.financial_health_service import calculate_financial_health_score

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=Dict[str, Any])
async def get_dashboard_summary(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns aggregated dashboard metrics:
    - Total balance & accounts
    - Monthly income, expenses, savings, savings rate
    - Net worth (Assets - Liabilities)
    - Financial health score & rating
    - Recent transactions
    - Expense categories breakdown
    - Income vs Expense monthly trend
    - Suggested AI advisor prompts
    """
    db = DataService(user.id)
    
    # Fetch user data in parallel
    accounts = await db.get_accounts()
    transactions = await db.get_transactions(limit=100)
    assets = await db.get_assets()
    liabilities = await db.get_liabilities()
    profile = await db.get_or_create_profile(user.email)
    
    # Authoritative financial calculations
    analytics = calculate_analytics_summary(transactions, assets, liabilities)
    health = calculate_financial_health_score(analytics)

    # Total liquid balance across bank accounts
    total_bank_balance = sum(float(a.get("current_balance", 0.0)) for a in accounts)
    if total_bank_balance == 0.0 and analytics.get("liquid_savings", 0.0) > 0:
        total_bank_balance = analytics.get("liquid_savings", 0.0)

    # Formatted recent transactions (top 6)
    recent_transactions = transactions[:6]

    return {
        "profile": profile,
        "currency": profile.get("currency", "INR"),
        "total_balance": round(total_bank_balance, 2),
        "monthly_income": analytics.get("average_monthly_income", 0.0) or analytics.get("total_income", 0.0),
        "monthly_expenses": analytics.get("average_monthly_expenses", 0.0) or analytics.get("total_expenses", 0.0),
        "monthly_savings": analytics.get("total_savings", 0.0),
        "savings_rate": analytics.get("savings_rate", 0.0),
        "net_worth": analytics.get("net_worth", 0.0),
        "total_assets": analytics.get("total_assets", 0.0),
        "total_liabilities": analytics.get("total_liabilities", 0.0),
        "health_score": health.get("overall_score", 0),
        "health_rating": health.get("rating", "Good"),
        "health_positives": health.get("positive_factors", [])[:2],
        "health_improvements": health.get("areas_for_improvement", [])[:2],
        "category_spending": analytics.get("top_categories", [])[:6],
        "monthly_trends": analytics.get("monthly_trends", [])[-6:],
        "recent_transactions": recent_transactions,
        "suggested_prompts": [
            "Analyze my spending breakdown",
            "Can I afford an iPhone for ₹80,000?",
            "How can I improve my financial health score?",
            "What if my rent increases by ₹5,000?"
        ]
    }
