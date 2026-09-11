import pytest
from app.services.scenario_service import calculate_scenario

def test_iphone_affordability_example_from_spec():
    """
    Validates the exact example from section 3 of spec:
    Current liquid savings = ₹240,000
    Purchase = ₹80,000
    Remaining = ₹160,000
    Current monthly essential expenses = ₹55,000
    Estimated emergency-fund coverage before purchase = 4.36 months
    After purchase = 2.91 months
    """
    analytics = {
        "liquid_savings": 240000.0,
        "essential_expenses": 55000.0,
        "total_income": 100000.0,
        "average_monthly_income": 100000.0,
        "total_expenses": 65000.0,
        "average_monthly_expenses": 65000.0,
        "net_worth": 300000.0,
        "savings_rate": 35.0
    }

    result = calculate_scenario(
        scenario_type="one_time_purchase",
        amount=80000.0,
        item_name="iPhone 15",
        analytics=analytics
    )

    math = result["authoritative_math"]
    assert math["liquid_savings"] == 240000.0
    assert math["purchase"] == 80000.0
    assert math["remaining"] == 160000.0
    assert math["monthly_essential_expenses"] == 55000.0
    assert math["runway_before"] == pytest.approx(4.36, rel=1e-2)
    assert math["runway_after"] == pytest.approx(2.91, rel=1e-2)
    assert result["status"] in ("caution", "affordable")

def test_rent_increase_scenario():
    analytics = {
        "total_income": 80000.0,
        "average_monthly_income": 80000.0,
        "total_expenses": 50000.0,
        "average_monthly_expenses": 50000.0,
        "savings_rate": 37.5
    }

    result = calculate_scenario(
        scenario_type="expense_increase",
        amount=5000.0,
        analytics=analytics
    )

    assert result["details"]["monthly_hike"] == 5000.0
    assert result["details"]["annual_cost"] == 60000.0
    assert result["details"]["new_monthly_expenses"] == 55000.0
    assert result["details"]["new_monthly_savings"] == 25000.0
    # 25,000 / 80,000 * 100 = 31.25%
    assert result["details"]["new_savings_rate"] == 31.25

def test_new_emi_scenario():
    analytics = {
        "total_income": 100000.0,
        "average_monthly_income": 100000.0,
        "total_expenses": 60000.0,
        "average_monthly_expenses": 60000.0,
        "total_monthly_debt": 5000.0,
        "debt_to_income_ratio": 5.0,
        "savings_rate": 40.0
    }
    goals = [
        {"name": "Emergency Fund", "target_amount": 100000.0, "current_amount": 20000.0}
    ]

    result = calculate_scenario(
        scenario_type="new_emi",
        amount=15000.0,
        item_name="Car Loan EMI",
        analytics=analytics,
        goals=goals
    )

    assert result["details"]["emi_amount"] == 15000.0
    # Current debt = 5,000 + 15,000 = 20,000
    assert result["metrics_after"]["monthly_debt"] == 20000.0
    # New debt-to-income: 20,000 / 100,000 * 100 = 20%
    assert result["metrics_after"]["debt_to_income"] == 20.0
    # New savings: (100,000 - 60,000) - 15,000 = 25,000
    assert result["metrics_after"]["monthly_savings"] == 25000.0
    # New savings rate: 25%
    assert result["metrics_after"]["savings_rate"] == 25.0
    assert result["status"] == "affordable"

