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

    # Recurring Subscriptions Detection
    subscription_keywords = {
        "netflix", "spotify", "prime", "hotstar", "youtube", "disney", "gym", "cult",
        "adobe", "apple", "icloud", "google storage", "broadband", "airtel", "jio",
        "membership", "subscription", "cloud", "aws", "github"
    }
    detected_subscriptions = []
    seen_sub_keys = set()
    total_monthly_subscriptions = 0.0

    for tx in transactions:
        desc_lower = str(tx.get("description", "")).lower()
        cat = str(tx.get("category", "")).lower()
        amt = float(tx.get("amount", 0.0))
        t_type = tx.get("transaction_type", "expense")

        if t_type == "expense" and (cat == "subscriptions" or any(kw in desc_lower for kw in subscription_keywords)):
            merchant_name = tx.get("merchant") or tx.get("description", "Subscription")
            sub_key = merchant_name.lower().strip()
            if sub_key not in seen_sub_keys:
                seen_sub_keys.add(sub_key)
                detected_subscriptions.append({
                    "name": merchant_name,
                    "category": tx.get("category", "Subscriptions"),
                    "amount": round(amt, 2),
                    "billing_frequency": "Monthly",
                    "last_billed": str(tx.get("date", "")),
                    "is_dormant_risk": cat in ("entertainment", "subscriptions") and amt > 1000.0
                })
                total_monthly_subscriptions += amt

    # Liability Intelligence: True cost of loans & Debt Ranking (Avalanche vs Snowball)
    enriched_liabilities = []
    total_annual_interest_drag = 0.0

    for l in liabilities:
        outstanding = float(l.get("outstanding_amount", 0.0))
        rate = float(l.get("interest_rate") or 0.0)
        emi = float(l.get("monthly_payment", 0.0))
        annual_interest = round(outstanding * (rate / 100.0), 2)
        monthly_interest_drag = round(annual_interest / 12.0, 2)
        total_annual_interest_drag += annual_interest

        enriched_liabilities.append({
            **l,
            "annual_interest_cost": annual_interest,
            "monthly_interest_drag": monthly_interest_drag,
            "effective_rate": rate
        })

    # Debt Avalanche (ranked by highest interest rate first - saves the most money)
    avalanche_ranking = sorted(
        [l for l in enriched_liabilities if float(l.get("outstanding_amount", 0.0)) > 0],
        key=lambda x: (float(x.get("interest_rate") or 0.0), float(x.get("outstanding_amount", 0.0))),
        reverse=True
    )

    # Debt Snowball (ranked by lowest outstanding balance first - quick psychological wins)
    snowball_ranking = sorted(
        [l for l in enriched_liabilities if float(l.get("outstanding_amount", 0.0)) > 0],
        key=lambda x: float(x.get("outstanding_amount", 0.0))
    )

    priority_debt_to_clear = avalanche_ranking[0] if avalanche_ranking else None

    # Cash Flow View: Month-End Balance Projection & Shortfall Warning
    committed_inflows = average_monthly_income if average_monthly_income > 0 else total_income
    committed_outflows = total_monthly_debt + total_monthly_subscriptions + (essential_expenses / month_count if month_count > 0 else essential_expenses)
    projected_discretionary = (discretionary_expenses / month_count) if month_count > 0 else discretionary_expenses
    projected_month_end_balance = liquid_savings + committed_inflows - committed_outflows - projected_discretionary
    shortfall_detected = (committed_outflows + projected_discretionary) > committed_inflows or projected_month_end_balance < 0
    shortfall_gap = round(abs(min(0.0, projected_month_end_balance)), 2)

    cash_flow_projection = {
        "current_liquid_balance": round(liquid_savings, 2),
        "committed_inflows": round(committed_inflows, 2),
        "committed_outflows": round(committed_outflows, 2),
        "projected_discretionary": round(projected_discretionary, 2),
        "projected_month_end_balance": round(projected_month_end_balance, 2),
        "projected_net_savings": round(committed_inflows - committed_outflows - projected_discretionary, 2),
        "shortfall_detected": shortfall_detected,
        "shortfall_gap": shortfall_gap,
        "safe_buffer_threshold": round(committed_outflows * 1.5, 2)
    }

    # Actionable Alerts Generation
    actionable_alerts = []

    # 1. Shortfall alert
    if shortfall_detected and shortfall_gap > 0:
        actionable_alerts.append({
            "type": "shortfall_warning",
            "severity": "danger",
            "title": "Month-End Shortfall Risk Detected",
            "message": f"Committed outflows and average discretionary spend will lead to a projected deficit of ₹{shortfall_gap:,.2f} by month end.",
            "numbers_behind": f"Inflow: ₹{committed_inflows:,.2f} | Committed Outflow: ₹{committed_outflows:,.2f} | Discretionary: ₹{projected_discretionary:,.2f}"
        })

    # 2. Upcoming large debits / EMIs
    if liabilities:
        for l in liabilities:
            emi = float(l.get("monthly_payment", 0.0))
            due_day = l.get("due_date")
            if emi > 0:
                actionable_alerts.append({
                    "type": "upcoming_debit",
                    "severity": "warning" if emi > (committed_inflows * 0.15) else "info",
                    "title": f"Upcoming Debt Obligation: {l.get('name')}",
                    "message": f"Monthly EMI of ₹{emi:,.2f} scheduled for {l.get('name')}{f' on day {due_day}' if due_day else ''}.",
                    "numbers_behind": f"Outstanding: ₹{float(l.get('outstanding_amount', 0)):,.2f} | Interest Rate: {l.get('interest_rate') or 'N/A'}%"
                })

    # 3. High interest liability alert
    if priority_debt_to_clear and float(priority_debt_to_clear.get("interest_rate") or 0.0) >= 12.0:
        p_rate = priority_debt_to_clear.get("interest_rate")
        p_drag = priority_debt_to_clear.get("annual_interest_cost", 0.0)
        actionable_alerts.append({
            "type": "liability_avalanche",
            "severity": "warning",
            "title": f"High-Interest Debt Drain: {priority_debt_to_clear.get('name')}",
            "message": f"This balance incurs {p_rate}% APR, costing approximately ₹{p_drag:,.2f}/yr in interest. Prioritize clearing this first.",
            "numbers_behind": f"Rate: {p_rate}% | Annual Interest Drag: ₹{p_drag:,.2f} | Outstanding: ₹{float(priority_debt_to_clear.get('outstanding_amount', 0)):,.2f}"
        })

    # 4. Recurring subscriptions review alert
    if detected_subscriptions:
        dormant_subs = [s for s in detected_subscriptions if s.get("is_dormant_risk")]
        if total_monthly_subscriptions > 1500.0 or dormant_subs:
            actionable_alerts.append({
                "type": "subscription_review",
                "severity": "info",
                "title": f"{len(detected_subscriptions)} Recurring Subscriptions Detected",
                "message": f"Total recurring subscription drain is ₹{total_monthly_subscriptions:,.2f}/month (₹{total_monthly_subscriptions * 12:,.2f}/year). Review for unused services.",
                "numbers_behind": f"Active subscriptions: {', '.join([s['name'] for s in detected_subscriptions[:4]])} totaling ₹{total_monthly_subscriptions:,.2f}/mo"
            })

    # 5. Unusual spending alert
    if len(monthly_trends) >= 2:
        recent_month_exp = monthly_trends[-1]["expenses"]
        prev_month_exp = monthly_trends[-2]["expenses"]
        if prev_month_exp > 0 and recent_month_exp > (prev_month_exp * 1.30):
            spike_pct = round(((recent_month_exp - prev_month_exp) / prev_month_exp) * 100.0, 1)
            actionable_alerts.append({
                "type": "unusual_spending",
                "severity": "warning",
                "title": "Unusual Spending Spike Detected",
                "message": f"Recent monthly expenditure jumped by +{spike_pct}% compared to the prior month.",
                "numbers_behind": f"Current Month: ₹{recent_month_exp:,.2f} vs Previous Month: ₹{prev_month_exp:,.2f}"
            })

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
        "debt_to_income_ratio": round(debt_to_income_ratio, 2),
        "recurring_subscriptions": detected_subscriptions,
        "total_monthly_subscriptions": round(total_monthly_subscriptions, 2),
        "liability_intelligence": {
            "total_annual_interest_drag": round(total_annual_interest_drag, 2),
            "avalanche_ranking": avalanche_ranking,
            "snowball_ranking": snowball_ranking,
            "priority_debt_to_clear": priority_debt_to_clear
        },
        "cash_flow_projection": cash_flow_projection,
        "actionable_alerts": actionable_alerts
    }
