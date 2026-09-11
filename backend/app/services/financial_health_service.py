from typing import Dict, Any, List
from datetime import datetime
import math

def calculate_financial_health_score(analytics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Authoritative 0-100 Financial Health Wellness Indicator.
    Deterministic Python calculations adhering strictly to weighted wellness pillars:
    - Savings Rate (30 pts)
    - Expense Consistency (20 pts)
    - Debt Burden (20 pts)
    - Emergency Savings (15 pts)
    - Net Worth Trend (15 pts)
    """
    total_income = analytics.get("total_income", 0.0)
    total_expenses = analytics.get("total_expenses", 0.0)
    savings_rate = analytics.get("savings_rate", 0.0)
    monthly_trends = analytics.get("monthly_trends", [])
    debt_to_income = analytics.get("debt_to_income_ratio", 0.0)
    liquid_savings = analytics.get("liquid_savings", 0.0)
    essential_expenses = analytics.get("essential_expenses", 0.0)
    average_expenses = analytics.get("average_monthly_expenses", 0.0)
    total_assets = analytics.get("total_assets", 0.0)
    total_liabilities = analytics.get("total_liabilities", 0.0)
    net_worth = analytics.get("net_worth", 0.0)

    positive_factors: List[str] = []
    areas_for_improvement: List[str] = []
    actionable_recommendations: List[str] = []

    # -------------------------------------------------------------
    # 1. Savings Rate Pillar (Max 30 pts)
    # -------------------------------------------------------------
    if total_income <= 0 and total_expenses == 0:
        savings_score = 15.0
        s_status = "fair"
        s_details = "No income or expense data recorded yet."
    elif savings_rate >= 30.0:
        savings_score = 30.0
        s_status = "excellent"
        s_details = f"Exceptional savings rate of {savings_rate:.1f}% exceeds the 30% benchmark."
        positive_factors.append(f"Strong savings habit ({savings_rate:.1f}% of income saved).")
    elif savings_rate >= 20.0:
        savings_score = 24.0
        s_status = "good"
        s_details = f"Healthy savings rate of {savings_rate:.1f}% meets the recommended 20% threshold."
        positive_factors.append(f"Solid savings rate of {savings_rate:.1f}%.")
    elif savings_rate >= 10.0:
        savings_score = 16.0
        s_status = "fair"
        s_details = f"Moderate savings rate of {savings_rate:.1f}%. Increasing to 20% builds resilience."
        areas_for_improvement.append("Savings rate is below the recommended 20% target.")
        actionable_recommendations.append("Identify 1-2 non-essential expenses to trim to reach a 20% savings rate.")
    elif savings_rate >= 0.0:
        savings_score = 8.0
        s_status = "poor"
        s_details = f"Low savings rate of {savings_rate:.1f}%. Most income is consumed by expenses."
        areas_for_improvement.append("Near-zero savings margin leaves little buffer for emergencies.")
        actionable_recommendations.append("Set a target to save at least 10% of monthly income before discretionary spending.")
    else:
        savings_score = 0.0
        s_status = "poor"
        s_details = f"Negative cash flow with expenses exceeding income (Savings rate: {savings_rate:.1f}%)."
        areas_for_improvement.append("Current spending exceeds monthly earnings (deficit spending).")
        actionable_recommendations.append("Immediately audit discretionary categories and reduce recurring outflows.")

    # -------------------------------------------------------------
    # 2. Expense Consistency Pillar (Max 20 pts)
    # -------------------------------------------------------------
    monthly_expenses_list = [m.get("expenses", 0.0) for m in monthly_trends if m.get("expenses", 0.0) > 0]
    
    if len(monthly_expenses_list) >= 2:
        mean_exp = sum(monthly_expenses_list) / len(monthly_expenses_list)
        variance = sum((x - mean_exp) ** 2 for x in monthly_expenses_list) / len(monthly_expenses_list)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_exp if mean_exp > 0 else 0.0

        if cv <= 0.15:
            consistency_score = 20.0
            c_status = "excellent"
            c_details = "Predictable and highly stable month-to-month expenditure."
            positive_factors.append("Consistent, disciplined monthly spending.")
        elif cv <= 0.30:
            consistency_score = 16.0
            c_status = "good"
            c_details = "Reasonable expense stability across recorded months."
        elif cv <= 0.50:
            consistency_score = 10.0
            c_status = "fair"
            c_details = "Moderate volatility in monthly spending spikes."
            areas_for_improvement.append("Monthly spending shows noticeable volatility.")
            actionable_recommendations.append("Establish monthly spending limits per category to smooth out volatility.")
        else:
            consistency_score = 5.0
            c_status = "poor"
            c_details = "High spending volatility between months."
            areas_for_improvement.append("Severe fluctuations in monthly spending.")
            actionable_recommendations.append("Review recent spikes and separate irregular annual expenses into a dedicated sinking fund.")
    else:
        consistency_score = 15.0
        c_status = "good"
        c_details = "Baseline consistency assigned; more monthly history will refine this metric."

    # -------------------------------------------------------------
    # 3. Debt Burden Pillar (Max 20 pts)
    # -------------------------------------------------------------
    if total_liabilities == 0:
        debt_score = 20.0
        d_status = "excellent"
        d_details = "Completely debt-free with zero outstanding liabilities."
        positive_factors.append("Zero debt burden.")
    elif debt_to_income <= 15.0:
        debt_score = 18.0
        d_status = "excellent"
        d_details = f"Very low debt burden with EMI obligations at {debt_to_income:.1f}% of income."
        positive_factors.append("Comfortable debt-to-income ratio below 15%.")
    elif debt_to_income <= 30.0:
        debt_score = 14.0
        d_status = "good"
        d_details = f"Manageable debt burden ({debt_to_income:.1f}% of monthly income)."
    elif debt_to_income <= 50.0:
        debt_score = 7.0
        d_status = "fair"
        d_details = f"Heavy debt burden ({debt_to_income:.1f}% of income committed to debt service)."
        areas_for_improvement.append("Debt obligations absorb a large share of monthly income.")
        actionable_recommendations.append("Prioritize paying down highest-interest liabilities first (debt avalanche).")
    else:
        debt_score = 2.0
        d_status = "poor"
        d_details = f"Critical debt burden ({debt_to_income:.1f}% of income absorbed by loans/cards)."
        areas_for_improvement.append("Critically high debt obligations restricting financial flexibility.")
        actionable_recommendations.append("Consider debt consolidation or structured repayment to lower monthly EMI burden.")

    # -------------------------------------------------------------
    # 4. Emergency Savings Pillar (Max 15 pts)
    # -------------------------------------------------------------
    monthly_burn = essential_expenses if essential_expenses > 0 else (average_expenses if average_expenses > 0 else 1.0)
    runway_months = liquid_savings / monthly_burn if monthly_burn > 0 else 0.0

    if runway_months >= 6.0:
        emergency_score = 15.0
        e_status = "excellent"
        e_details = f"Robust emergency fund covering {runway_months:.1f} months of expenses."
        positive_factors.append(f"Well-funded emergency cushion ({runway_months:.1f} months coverage).")
    elif runway_months >= 3.0:
        emergency_score = 11.0
        e_status = "good"
        e_details = f"Adequate emergency buffer covering {runway_months:.1f} months of expenses."
        positive_factors.append("Adequate 3+ month emergency reserve.")
    elif runway_months >= 1.0:
        emergency_score = 6.0
        e_status = "fair"
        e_details = f"Modest emergency cushion covering {runway_months:.1f} months. Target is 3-6 months."
        areas_for_improvement.append("Emergency fund provides less than 3 months of expense coverage.")
        actionable_recommendations.append("Direct surplus savings to build emergency savings to at least 3 months.")
    else:
        emergency_score = 2.0
        e_status = "poor"
        e_details = f"Vulnerable emergency cushion ({runway_months:.1f} months). Financial shock risk."
        areas_for_improvement.append("Liquid emergency fund is critically low (less than 1 month runway).")
        actionable_recommendations.append("Start building an emergency fund in high-yield liquid savings immediately.")

    # -------------------------------------------------------------
    # 5. Net Worth Trend Pillar (Max 15 pts)
    # -------------------------------------------------------------
    if total_assets > 0 and total_liabilities == 0:
        nw_score = 15.0
        nw_status = "excellent"
        nw_details = "Pure positive asset accumulation with zero debt drag."
        positive_factors.append("Positive net worth with zero liabilities.")
    elif total_assets > (2.0 * total_liabilities) and net_worth > 0:
        nw_score = 15.0
        nw_status = "excellent"
        nw_details = "Strong solvency with assets more than doubling total liabilities."
        positive_factors.append("High solvency ratio (Assets > 2x Liabilities).")
    elif net_worth > 0:
        nw_score = 11.0
        nw_status = "good"
        nw_details = f"Positive net worth of ₹{net_worth:,.2f}."
        positive_factors.append("Positive net worth.")
    elif net_worth == 0 and total_assets == 0:
        nw_score = 8.0
        nw_status = "fair"
        nw_details = "No assets or liabilities recorded yet."
    else:
        nw_score = 2.0
        nw_status = "poor"
        nw_details = f"Negative net worth of ₹{net_worth:,.2f}. Liabilities exceed total assets."
        areas_for_improvement.append("Liabilities exceed assets, resulting in negative net worth.")
        actionable_recommendations.append("Focus on liability reduction to restore positive net worth equity.")

    # -------------------------------------------------------------
    # Overall Score & Rating
    # -------------------------------------------------------------
    overall_score = int(round(savings_score + consistency_score + debt_score + emergency_score + nw_score))
    overall_score = max(0, min(100, overall_score))

    if overall_score >= 80:
        rating = "Excellent"
    elif overall_score >= 65:
        rating = "Good"
    elif overall_score >= 50:
        rating = "Fair"
    else:
        rating = "Needs Attention"

    if not positive_factors:
        positive_factors.append("Foundation established to track and optimize personal finances.")
    if not areas_for_improvement:
        areas_for_improvement.append("Keep monitoring discretionary outflows and automate long-term investments.")
    if not actionable_recommendations:
        actionable_recommendations.append("Maintain existing savings habits and periodically review goal milestones.")

    return {
        "overall_score": overall_score,
        "rating": rating,
        "components": {
            "savings_rate": {
                "name": "Savings Rate",
                "score": savings_score,
                "max_score": 30.0,
                "weight_percentage": 30,
                "status": s_status,
                "details": s_details
            },
            "expense_consistency": {
                "name": "Expense Consistency",
                "score": consistency_score,
                "max_score": 20.0,
                "weight_percentage": 20,
                "status": c_status,
                "details": c_details
            },
            "debt_burden": {
                "name": "Debt Burden",
                "score": debt_score,
                "max_score": 20.0,
                "weight_percentage": 20,
                "status": d_status,
                "details": d_details
            },
            "emergency_savings": {
                "name": "Emergency Savings",
                "score": emergency_score,
                "max_score": 15.0,
                "weight_percentage": 15,
                "status": e_status,
                "details": e_details
            },
            "net_worth_trend": {
                "name": "Net Worth & Solvency",
                "score": nw_score,
                "max_score": 15.0,
                "weight_percentage": 15,
                "status": nw_status,
                "details": nw_details
            }
        },
        "positive_factors": positive_factors,
        "areas_for_improvement": areas_for_improvement,
        "actionable_recommendations": actionable_recommendations,
        "calculated_at": datetime.now().isoformat()
    }
