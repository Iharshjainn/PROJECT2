import pytest
from app.services.financial_health_service import calculate_financial_health_score

def test_financial_health_score():
    analytics = {
        "total_income": 100000.0,
        "total_expenses": 60000.0,
        "savings_rate": 40.0, # >=30% -> 30 pts
        "monthly_trends": [
            {"expenses": 58000.0},
            {"expenses": 62000.0}
        ],
        "debt_to_income_ratio": 10.0, # <=15% -> 18 pts
        "liquid_savings": 360000.0,
        "essential_expenses": 45000.0, # 360,000 / 45,000 = 8 months >= 6 months -> 15 pts
        "total_assets": 500000.0,
        "total_liabilities": 100000.0, # Assets > 2x Liabilities -> 15 pts
        "net_worth": 400000.0
    }

    res = calculate_financial_health_score(analytics)

    # Check overall score range
    assert 0 <= res["overall_score"] <= 100
    assert res["rating"] == "Excellent"
    assert "savings_rate" in res["components"]
    assert res["components"]["savings_rate"]["score"] == 30.0
    assert res["components"]["debt_burden"]["score"] == 18.0
    assert res["components"]["emergency_savings"]["score"] == 15.0
    assert res["components"]["net_worth_trend"]["score"] == 15.0
    assert len(res["positive_factors"]) > 0
