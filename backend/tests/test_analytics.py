import pytest
from app.services.analytics_service import calculate_analytics_summary

def test_analytics_calculations():
    transactions = [
        {"id": "1", "date": "2026-08-01", "description": "Salary", "amount": 100000.0, "transaction_type": "income", "category": "Salary"},
        {"id": "2", "date": "2026-08-05", "description": "House Rent", "amount": 30000.0, "transaction_type": "expense", "category": "Housing"},
        {"id": "3", "date": "2026-08-10", "description": "Groceries", "amount": 15000.0, "transaction_type": "expense", "category": "Groceries"},
        {"id": "4", "date": "2026-08-15", "description": "Dining Out", "amount": 5000.0, "transaction_type": "expense", "category": "Food"},
        {"id": "5", "date": "2026-08-20", "description": "Shopping", "amount": 10000.0, "transaction_type": "expense", "category": "Shopping"},
    ]

    assets = [
        {"name": "Savings Account", "asset_type": "savings", "current_value": 200000.0},
        {"name": "Mutual Funds", "asset_type": "mutual_funds", "current_value": 300000.0},
    ]

    liabilities = [
        {"name": "Car Loan", "liability_type": "car_loan", "outstanding_amount": 100000.0, "monthly_payment": 10000.0}
    ]

    res = calculate_analytics_summary(transactions, assets, liabilities)

    # Core formulas verification:
    # Total Income = 100,000
    assert res["total_income"] == 100000.0
    # Total Expenses = 30000 + 15000 + 5000 + 10000 = 60,000
    assert res["total_expenses"] == 60000.0
    # Savings = Income - Expenses = 40,000
    assert res["total_savings"] == 40000.0
    # Savings Rate = 40,000 / 100,000 * 100 = 40%
    assert res["savings_rate"] == 40.0

    # Essential: Housing (30000) + Groceries (15000) = 45000
    assert res["essential_expenses"] == 45000.0
    # Discretionary: Food (5000) + Shopping (10000) = 15000
    assert res["discretionary_expenses"] == 15000.0

    # Assets = 500,000
    assert res["total_assets"] == 500000.0
    # Liabilities = 100,000
    assert res["total_liabilities"] == 100000.0
    # Net Worth = Total Assets - Total Liabilities = 400,000
    assert res["net_worth"] == 400000.0
    # Liquid Savings = 200,000 + 300,000 = 500,000
    assert res["liquid_savings"] == 500000.0

    # Debt-to-income: 10,000 / 100,000 * 100 = 10%
    assert res["debt_to_income_ratio"] == 10.0
