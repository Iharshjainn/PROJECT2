import re
from typing import Dict, Any, List, Optional
from app.services.scenario_service import calculate_scenario

def extract_amount_from_text(text: str) -> Optional[float]:
    """Extracts numeric currency amounts from natural language (e.g., '80,000', '80000', '2 lakh', '1.5k')."""
    text_clean = text.lower()
    
    # Check for lakh: e.g. "2 lakh", "2.5 lakhs"
    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lac)s?', text_clean)
    if lakh_match:
        return float(lakh_match.group(1)) * 100000.0

    # Check for k: e.g. "50k"
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*k\b', text_clean)
    if k_match:
        return float(k_match.group(1)) * 1000.0

    # Check for rupee amounts: ₹80,000 or rs 80000 or 80000
    rupee_match = re.search(r'(?:(?:₹|rs\.?|inr)\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{3,9}(?:\.\d{2})?)', text_clean)
    if rupee_match:
        num_str = rupee_match.group(1).replace(',', '')
        try:
            return float(num_str)
        except ValueError:
            return None
            
    return None

def build_ai_context(
    user_message: str,
    analytics: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    goals: List[Dict[str, Any]],
    assets: List[Dict[str, Any]],
    liabilities: List[Dict[str, Any]],
    health_score: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Constructs targeted financial facts and runs deterministic calculations
    relevant to the user's inquiry so Gemini is grounded on exact Python-computed figures.
    """
    msg_lower = user_message.lower()
    
    context_data: Dict[str, Any] = {
        "user_financial_profile": {
            "monthly_income": analytics.get("average_monthly_income", 0.0),
            "monthly_expenses": analytics.get("average_monthly_expenses", 0.0),
            "monthly_savings": analytics.get("total_savings", 0.0),
            "savings_rate_pct": analytics.get("savings_rate", 0.0),
            "liquid_savings": analytics.get("liquid_savings", 0.0),
            "total_assets": analytics.get("total_assets", 0.0),
            "total_liabilities": analytics.get("total_liabilities", 0.0),
            "net_worth": analytics.get("net_worth", 0.0),
            "financial_health_score": health_score.get("overall_score", 0),
            "financial_health_rating": health_score.get("rating", "Unrated"),
        }
    }

    # -------------------------------------------------------------
    # 1. SCENARIO / AFFORDABILITY INTENT DETECTION
    # -------------------------------------------------------------
    # -------------------------------------------------------------
    # 1. SCENARIO / AFFORDABILITY INTENT DETECTION
    # -------------------------------------------------------------
    is_affordability = any(phrase in msg_lower for phrase in [
        "can i afford", "should i buy", "worth buying", "can i buy", "purchase of", "planning to buy"
    ])
    
    is_scenario = any(phrase in msg_lower for phrase in [
        "what if", "scenario", "hypothetical", "suppose i", "if i spend", "if my salary",
        "if my rent", "if i save", "take a loan", "new emi", "car emi"
    ])

    extracted_amount = extract_amount_from_text(user_message)

    if (is_affordability or is_scenario) and extracted_amount:
        # Determine scenario category
        if "emi" in msg_lower or "car loan" in msg_lower or "personal loan" in msg_lower:
            calc_result = calculate_scenario("new_emi", extracted_amount, "New EMI Commitment", analytics=analytics, goals=goals)
        elif "rent" in msg_lower or "expense" in msg_lower or "monthly" in msg_lower:
            calc_result = calculate_scenario("expense_increase", extracted_amount, "Expense Hike", analytics=analytics)
        elif "salary" in msg_lower or "income" in msg_lower or "raise" in msg_lower:
            calc_result = calculate_scenario("salary_change", extracted_amount, "Salary Adjustment", analytics=analytics)
        elif "debt" in msg_lower or "loan" in msg_lower or "repay" in msg_lower:
            calc_result = calculate_scenario("debt_repayment", extracted_amount, "Debt Payoff", analytics=analytics)
        elif "save" in msg_lower or "saving" in msg_lower:
            calc_result = calculate_scenario("savings_increase", extracted_amount, "Accelerated Savings", analytics=analytics)
        else:
            # Default to one-time purchase affordability
            calc_result = calculate_scenario("one_time_purchase", extracted_amount, "Requested Purchase", analytics=analytics)

        context_data["authoritative_scenario_calculation"] = calc_result
        context_data["calculation_instruction"] = (
            "CRITICAL: The numbers under 'authoritative_scenario_calculation' were computed deterministically "
            "by the Python engine. You MUST reference these exact figures and explain the financial logic clearly."
        )

    # -------------------------------------------------------------
    # 2. CASH FLOW & MONTH-END BALANCE PROJECTION
    # -------------------------------------------------------------
    if any(k in msg_lower for k in ["cash flow", "month end", "shortfall", "deficit", "balance next month", "project", "run out of money"]):
        context_data["cash_flow_projection"] = analytics.get("cash_flow_projection", {})

    # -------------------------------------------------------------
    # 3. RECURRING SUBSCRIPTIONS INQUIRY
    # -------------------------------------------------------------
    if any(k in msg_lower for k in ["subscription", "recurring", "netflix", "spotify", "gym", "membership", "broadband", "cancel"]):
        context_data["subscription_intelligence"] = {
            "total_monthly_subscription_spend": analytics.get("total_monthly_subscriptions", 0.0),
            "detected_subscriptions": analytics.get("recurring_subscriptions", [])
        }

    # -------------------------------------------------------------
    # 4. LIABILITY INTELLIGENCE & DEBT RANKING
    # -------------------------------------------------------------
    if any(k in msg_lower for k in ["debt", "loan", "clear first", "pay off first", "avalanche", "snowball", "interest rate", "credit card"]):
        context_data["liability_intelligence"] = analytics.get("liability_intelligence", {})

    # -------------------------------------------------------------
    # 5. ACTIONABLE ALERTS
    # -------------------------------------------------------------
    alerts = analytics.get("actionable_alerts", [])
    if alerts:
        context_data["current_actionable_alerts"] = alerts

    # -------------------------------------------------------------
    # 6. CATEGORY SPENDING INQUIRY
    # -------------------------------------------------------------
    top_cats = analytics.get("top_categories", [])
    matched_cat = None
    for cat_item in top_cats:
        c_name = cat_item["category"].lower()
        if c_name in msg_lower:
            matched_cat = cat_item
            break

    if matched_cat:
        context_data["specific_category_analysis"] = matched_cat
        # Attach recent matching transactions
        matched_txs = [
            {"date": str(tx.get("date")), "desc": tx.get("description"), "amount": tx.get("amount")}
            for tx in transactions 
            if (tx.get("category") or "").lower() == matched_cat["category"].lower()
        ][:8]
        context_data["recent_category_transactions"] = matched_txs
    else:
        # Include top 5 spending categories
        context_data["top_expense_categories"] = top_cats[:5]

    # -------------------------------------------------------------
    # 7. HABIT & TREND INQUIRY
    # -------------------------------------------------------------
    if any(k in msg_lower for k in ["habit", "overspending", "trend", "improve", "cut", "reduce", "waste"]):
        context_data["habit_analytics"] = {
            "discretionary_expenses": analytics.get("discretionary_expenses", 0.0),
            "essential_expenses": analytics.get("essential_expenses", 0.0),
            "largest_single_expenses": analytics.get("largest_expenses", [])[:5],
            "health_areas_for_improvement": health_score.get("areas_for_improvement", []),
            "health_recommendations": health_score.get("actionable_recommendations", [])
        }

    # -------------------------------------------------------------
    # 8. GOALS INQUIRY
    # -------------------------------------------------------------
    if any(k in msg_lower for k in ["goal", "target", "emergency fund", "future", "retire"]):
        context_data["active_financial_goals"] = [
            {
                "name": g.get("name"),
                "target_amount": g.get("target_amount"),
                "current_amount": g.get("current_amount"),
                "target_date": str(g.get("target_date")),
                "progress_pct": round((float(g.get("current_amount", 0)) / float(g.get("target_amount", 1))) * 100, 1)
            }
            for g in goals[:5]
        ]

    # -------------------------------------------------------------
    # 9. RECENT CASH FLOW TRENDS
    # -------------------------------------------------------------
    trends = analytics.get("monthly_trends", [])
    if trends:
        context_data["recent_monthly_trends"] = trends[-3:]

    return context_data
