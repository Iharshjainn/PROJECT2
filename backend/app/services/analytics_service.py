from typing import List, Dict, Any, Optional
from collections import defaultdict
from datetime import datetime, date
import math

ESSENTIAL_CATEGORIES = {"Groceries", "Housing", "Utilities", "Health", "Transport", "Fees"}
DISCRETIONARY_CATEGORIES = {"Food", "Shopping", "Entertainment", "Subscriptions", "Travel", "Other"}

def calculate_analytics_summary(
    transactions: List[Dict[str, Any]],
    assets: List[Dict[str, Any]],
    liabilities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Deterministic Python backend financial calculation engine.
    Produces authoritative metrics: income, expenses, savings, savings rate,
    discretionary vs essential spend, category distributions, net worth, and debt burden.
    """
    total_income = 0.0
    total_expenses = 0.0
    
    category_totals = defaultdict(float)
    category_counts = defaultdict(int)
    monthly_data = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    
    essential_expenses = 0.0
    discretionary_expenses = 0.0

    valid_expenses = []

    for tx in transactions:
        t_type = tx.get("transaction_type", "expense")
        amt = float(tx.get("amount", 0.0))
        cat = tx.get("category") or "Other"
        tx_date_str = str(tx.get("date", ""))
        
        # Parse month key YYYY-MM
        try:
            month_key = tx_date_str[:7] if len(tx_date_str) >= 7 else "Unknown"
        except Exception:
            month_key = "Unknown"

        if t_type == "income":
            total_income += amt
            if month_key != "Unknown":
                monthly_data[month_key]["income"] += amt
        elif t_type == "expense":
            total_expenses += amt
            category_totals[cat] += amt
            category_counts[cat] += 1
            if month_key != "Unknown":
                monthly_data[month_key]["expenses"] += amt

            if cat in ESSENTIAL_CATEGORIES:
                essential_expenses += amt
            else:
                discretionary_expenses += amt

            valid_expenses.append({
                "id": tx.get("id"),
                "date": tx_date_str,
                "description": tx.get("description", ""),
                "amount": round(amt, 2),
                "category": cat,
                "merchant": tx.get("merchant")
            })

    # Net Savings & Savings Rate
    # Savings = Income - Expenses
    # Savings Rate = (Savings / Income) * 100
    total_savings = total_income - total_expenses
    if total_income > 0:
        savings_rate = (total_savings / total_income) * 100.0
    else:
        savings_rate = 0.0 if total_expenses == 0 else -100.0

    # Monthly trends (sorted chronologically)
    monthly_trends = []
    sorted_months = sorted([m for m in monthly_data.keys() if m != "Unknown"])
    
    for m in sorted_months:
        inc = monthly_data[m]["income"]
        exp = monthly_data[m]["expenses"]
        sav = inc - exp
        s_rate = (sav / inc * 100.0) if inc > 0 else (0.0 if exp == 0 else -100.0)
        monthly_trends.append({
            "month": m,
            "income": round(inc, 2),
            "expenses": round(exp, 2),
            "savings": round(sav, 2),
            "savings_rate": round(s_rate, 2)
        })

    month_count = max(len(sorted_months), 1)
    average_monthly_income = total_income / month_count
    average_monthly_expenses = total_expenses / month_count

    # Top categories
    top_categories = []
    for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
        pct = (amt / total_expenses * 100.0) if total_expenses > 0 else 0.0
        top_categories.append({
            "category": cat,
            "amount": round(amt, 2),
            "percentage": round(pct, 2),
            "count": category_counts[cat]
        })

    # Largest expenses
    largest_expenses = sorted(valid_expenses, key=lambda x: x["amount"], reverse=True)[:5]

    # Balance sheet: Assets & Liabilities
    # Net Worth = Total Assets - Total Liabilities
    total_assets = sum(float(a.get("current_value", 0.0)) for a in assets)
    total_liabilities = sum(float(l.get("outstanding_amount", 0.0)) for l in liabilities)
    net_worth = total_assets - total_liabilities

    # Liquid savings (Cash, Bank, Savings, Stocks, Liquid MFs)
    liquid_asset_types = {"cash", "savings", "bank", "stocks", "mutual_funds"}
    liquid_savings = sum(
        float(a.get("current_value", 0.0)) 
        for a in assets 
        if str(a.get("asset_type", "")).lower() in liquid_asset_types
    )

    # Total monthly debt obligations (EMIs)
    total_monthly_debt = sum(float(l.get("monthly_payment", 0.0)) for l in liabilities)

    # Debt burden ratio: (monthly debt payments / monthly income)
    monthly_baseline_income = average_monthly_income if average_monthly_income > 0 else total_income
    if monthly_baseline_income > 0:
        debt_to_income_ratio = (total_monthly_debt / monthly_baseline_income) * 100.0
    else:
        debt_to_income_ratio = 100.0 if total_monthly_debt > 0 else 0.0

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "total_savings": round(total_savings, 2),
        "savings_rate": round(savings_rate, 2),
        "average_monthly_income": round(average_monthly_income, 2),
        "average_monthly_expenses": round(average_monthly_expenses, 2),
        "discretionary_expenses": round(discretionary_expenses, 2),
        "essential_expenses": round(essential_expenses, 2),
        "top_categories": top_categories,
        "monthly_trends": monthly_trends,
        "largest_expenses": largest_expenses,
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": round(net_worth, 2),
        "liquid_savings": round(liquid_savings, 2),
        "total_monthly_debt": round(total_monthly_debt, 2),
        "debt_to_income_ratio": round(debt_to_income_ratio, 2)
    }
