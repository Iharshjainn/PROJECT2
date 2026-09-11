from typing import Dict, Any, List, Optional
from datetime import datetime

def calculate_scenario(
    scenario_type: str,
    amount: float,
    item_name: str = "Purchase",
    percentage_change: Optional[float] = None,
    analytics: Optional[Dict[str, Any]] = None,
    goals: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Deterministic Python backend scenario calculation engine.
    Calculates exact arithmetic changes caused by hypothetical scenarios.
    Gemini NEVER invents these numbers; it only interprets the structured results returned here.
    """
    analytics = analytics or {}
    goals = goals or []
    
    total_income = analytics.get("total_income", 0.0)
    avg_income = analytics.get("average_monthly_income", 0.0)
    monthly_income = avg_income if avg_income > 0 else total_income

    total_expenses = analytics.get("total_expenses", 0.0)
    avg_expenses = analytics.get("average_monthly_expenses", 0.0)
    monthly_expenses = avg_expenses if avg_expenses > 0 else total_expenses

    essential_expenses = analytics.get("essential_expenses", 0.0)
    if essential_expenses <= 0:
        essential_expenses = monthly_expenses * 0.65 if monthly_expenses > 0 else 30000.0

    liquid_savings = analytics.get("liquid_savings", 0.0)
    if liquid_savings <= 0:
        # Fallback to total assets or estimated buffer if no explicit liquid accounts
        liquid_savings = max(analytics.get("total_assets", 0.0), 0.0)

    total_liabilities = analytics.get("total_liabilities", 0.0)
    net_worth = analytics.get("net_worth", 0.0)
    current_savings_rate = analytics.get("savings_rate", 0.0)

    # -------------------------------------------------------------
    # 1. ONE-TIME PURCHASE / AFFORDABILITY
    # -------------------------------------------------------------
    if scenario_type == "one_time_purchase":
        purchase_cost = float(amount)
        remaining_savings = liquid_savings - purchase_cost
        
        # Emergency fund runway in months before and after
        burn_rate = essential_expenses if essential_expenses > 0 else (monthly_expenses if monthly_expenses > 0 else 1.0)
        runway_before = liquid_savings / burn_rate
        runway_after = max(0.0, remaining_savings) / burn_rate

        # Solvency & Affordability Logic
        if purchase_cost > liquid_savings:
            status = "not_advisable"
            summary = (
                f"Not advisable. The purchase cost of ₹{purchase_cost:,.2f} exceeds your currently available "
                f"liquid savings of ₹{liquid_savings:,.2f} by ₹{abs(remaining_savings):,.2f}."
            )
        elif runway_after < 2.0:
            status = "not_advisable"
            summary = (
                f"Not recommended right now. Spending ₹{purchase_cost:,.2f} reduces your liquid emergency buffer "
                f"from {runway_before:.2f} months to {runway_after:.2f} months (below the safe 2-month threshold)."
            )
        elif runway_after < 3.5 or (liquid_savings > 0 and (purchase_cost / liquid_savings) > 0.40):
            status = "caution"
            summary = (
                f"Proceed with caution. You can pay ₹{purchase_cost:,.2f} in cash, but it consumes "
                f"{(purchase_cost / liquid_savings * 100):.1f}% of your liquid savings, dropping your emergency buffer to {runway_after:.2f} months."
            )
        else:
            status = "affordable"
            summary = (
                f"Affordable. After purchasing {item_name} for ₹{purchase_cost:,.2f}, you retain ₹{remaining_savings:,.2f} "
                f"in liquid savings, maintaining a healthy {runway_after:.2f} months of emergency runway."
            )

        recommendations = []
        if status == "affordable":
            recommendations.append(f"Safe to proceed using cash from liquid reserves without jeopardizing your emergency safety net.")
            recommendations.append(f"Consider looking for no-cost EMI or merchant cashback offers to preserve liquidity if terms are zero-fee.")
        elif status == "caution":
            recommendations.append(f"If non-essential, consider saving for 2-3 months before purchasing so your runway stays above 4 months.")
            recommendations.append(f"Cut back on discretionary dining or shopping over the next 60 days to replenish the ₹{purchase_cost:,.2f}.")
        else:
            recommendations.append(f"Prioritize building your emergency fund to at least 3-6 months of essential expenses before this major purchase.")
            recommendations.append(f"Avoid high-interest credit card debt or personal loans to finance this purchase.")

        return {
            "scenario_type": scenario_type,
            "title": f"Affordability Analysis: {item_name}",
            "status": status,
            "summary": summary,
            "details": {
                "item_name": item_name,
                "purchase_amount": round(purchase_cost, 2),
                "liquid_savings_before": round(liquid_savings, 2),
                "liquid_savings_after": round(remaining_savings, 2),
                "essential_monthly_burn": round(burn_rate, 2),
                "emergency_runway_before_months": round(runway_before, 2),
                "emergency_runway_after_months": round(runway_after, 2),
                "percentage_of_savings_used": round((purchase_cost / liquid_savings * 100) if liquid_savings > 0 else 100.0, 2)
            },
            "metrics_before": {
                "liquid_savings": round(liquid_savings, 2),
                "emergency_months": round(runway_before, 2),
                "net_worth": round(net_worth, 2)
            },
            "metrics_after": {
                "liquid_savings": round(remaining_savings, 2),
                "emergency_months": round(runway_after, 2),
                "net_worth": round(net_worth - purchase_cost, 2)
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "liquid_savings": round(liquid_savings, 2),
                "purchase": round(purchase_cost, 2),
                "remaining": round(remaining_savings, 2),
                "monthly_essential_expenses": round(burn_rate, 2),
                "runway_before": round(runway_before, 2),
                "runway_after": round(runway_after, 2)
            }
        }

    # -------------------------------------------------------------
    # 2. MONTHLY EXPENSE INCREASE (e.g. Rent increase, subscriptions)
    # -------------------------------------------------------------
    elif scenario_type == "expense_increase":
        hike = float(amount)
        new_monthly_expenses = monthly_expenses + hike
        new_monthly_savings = monthly_income - new_monthly_expenses
        new_savings_rate = (new_monthly_savings / monthly_income * 100.0) if monthly_income > 0 else 0.0
        annual_impact = hike * 12.0

        if new_monthly_savings < 0:
            status = "not_advisable"
            summary = (
                f"Warning: A monthly expense increase of ₹{hike:,.2f} pushes your monthly budget into a "
                f"deficit of ₹{abs(new_monthly_savings):,.2f}/month (total expenses ₹{new_monthly_expenses:,.2f} vs income ₹{monthly_income:,.2f})."
            )
        elif new_savings_rate < 10.0:
            status = "caution"
            summary = (
                f"Caution: Increasing monthly expenses by ₹{hike:,.2f} lowers your savings rate from "
                f"{current_savings_rate:.1f}% down to {new_savings_rate:.1f}%, costing ₹{annual_impact:,.2f} per year."
            )
        else:
            status = "neutral"
            summary = (
                f"Manageable: An additional ₹{hike:,.2f}/month (₹{annual_impact:,.2f}/year) will adjust your "
                f"monthly savings to ₹{new_monthly_savings:,.2f} (new savings rate: {new_savings_rate:.1f}%)."
            )

        recommendations = [
            f"Annual impact is ₹{annual_impact:,.2f}. Review discretionary spending to absorb part of this increase.",
            f"If feasible, check for alternatives or negotiate recurring contracts."
        ]

        return {
            "scenario_type": scenario_type,
            "title": f"Monthly Expense Increase (+₹{hike:,.2f}/mo)",
            "status": status,
            "summary": summary,
            "details": {
                "monthly_hike": round(hike, 2),
                "annual_cost": round(annual_impact, 2),
                "new_monthly_expenses": round(new_monthly_expenses, 2),
                "new_monthly_savings": round(new_monthly_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            },
            "metrics_before": {
                "monthly_expenses": round(monthly_expenses, 2),
                "monthly_savings": round(monthly_income - monthly_expenses, 2),
                "savings_rate": round(current_savings_rate, 2)
            },
            "metrics_after": {
                "monthly_expenses": round(new_monthly_expenses, 2),
                "monthly_savings": round(new_monthly_savings, 2),
                "savings_rate": round(new_savings_rate, 2)
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "hike": round(hike, 2),
                "annual_impact": round(annual_impact, 2),
                "new_savings": round(new_monthly_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            }
        }

    # -------------------------------------------------------------
    # 3. SALARY / INCOME CHANGE
    # -------------------------------------------------------------
    elif scenario_type == "salary_change":
        if percentage_change is not None:
            pct = float(percentage_change)
            change_amount = monthly_income * (pct / 100.0)
            new_income = monthly_income + change_amount
        else:
            change_amount = float(amount)
            new_income = monthly_income + change_amount
            pct = (change_amount / monthly_income * 100.0) if monthly_income > 0 else 0.0

        new_savings = new_income - monthly_expenses
        new_savings_rate = (new_savings / new_income * 100.0) if new_income > 0 else 0.0

        if change_amount >= 0:
            status = "positive"
            summary = (
                f"Income increase of {pct:+.1f}% (+₹{change_amount:,.2f}/mo) boosts monthly income to ₹{new_income:,.2f}. "
                f"Under current spending, your monthly savings jump to ₹{new_savings:,.2f} (savings rate: {new_savings_rate:.1f}%)."
            )
            recommendations = [
                f"Avoid lifestyle inflation: channel at least 50% of the ₹{change_amount:,.2f} increase straight into investments or debt reduction.",
                f"Accelerate existing financial goals by increasing monthly SIP contributions."
            ]
        else:
            if new_savings < 0:
                status = "not_advisable"
                summary = (
                    f"Warning: An income reduction of {pct:.1f}% (-₹{abs(change_amount):,.2f}/mo) reduces income to ₹{new_income:,.2f}, "
                    f"creating an immediate monthly deficit of ₹{abs(new_savings):,.2f} under current expense levels."
                )
                recommendations = [
                    f"Immediate spending cut required: Trim non-essential expenses by at least ₹{abs(new_savings):,.2f} to stop debt accumulation.",
                    f"Review subscriptions and discretionary outings to balance the budget."
                ]
            else:
                status = "caution"
                summary = (
                    f"Tightened budget: Income drops to ₹{new_income:,.2f}, leaving ₹{new_savings:,.2f}/month savings "
                    f"(savings rate declines to {new_savings_rate:.1f}%)."
                )
                recommendations = [
                    f"Prioritize essential expenses and temporarily pause discretionary travel or luxury purchases."
                ]

        return {
            "scenario_type": scenario_type,
            "title": f"Income Adjustment ({pct:+.1f}%)",
            "status": status,
            "summary": summary,
            "details": {
                "income_delta": round(change_amount, 2),
                "new_monthly_income": round(new_income, 2),
                "new_monthly_savings": round(new_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2),
                "annual_delta": round(change_amount * 12.0, 2)
            },
            "metrics_before": {
                "monthly_income": round(monthly_income, 2),
                "monthly_savings": round(monthly_income - monthly_expenses, 2),
                "savings_rate": round(current_savings_rate, 2)
            },
            "metrics_after": {
                "monthly_income": round(new_income, 2),
                "monthly_savings": round(new_savings, 2),
                "savings_rate": round(new_savings_rate, 2)
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "monthly_income_before": round(monthly_income, 2),
                "delta": round(change_amount, 2),
                "monthly_income_after": round(new_income, 2),
                "new_savings": round(new_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            }
        }

    # -------------------------------------------------------------
    # 4. DEBT REPAYMENT (Lump sum)
    # -------------------------------------------------------------
    elif scenario_type == "debt_repayment":
        repay_amt = float(amount)
        new_liabilities = max(0.0, total_liabilities - repay_amt)
        new_liquid = liquid_savings - repay_amt
        # Approx 12% average annual interest rate saved on revolving/personal debt
        est_annual_interest_saved = repay_amt * 0.12

        if repay_amt > liquid_savings:
            status = "not_advisable"
            summary = (
                f"You cannot make a lump-sum debt repayment of ₹{repay_amt:,.2f} because your available "
                f"liquid savings are ₹{liquid_savings:,.2f}."
            )
        else:
            status = "positive"
            summary = (
                f"Repaying ₹{repay_amt:,.2f} lowers outstanding debt from ₹{total_liabilities:,.2f} to ₹{new_liabilities:,.2f}, "
                f"saving an estimated ₹{est_annual_interest_saved:,.2f} in annual interest charges."
            )

        recommendations = [
            f"Target credit card debt or personal loans with interest rates above 12% first for maximum financial benefit.",
            f"Ensure you still preserve at least 3 months of emergency buffer after the payment."
        ]

        return {
            "scenario_type": scenario_type,
            "title": f"Lump-Sum Debt Repayment (₹{repay_amt:,.2f})",
            "status": status,
            "summary": summary,
            "details": {
                "repayment_amount": round(repay_amt, 2),
                "outstanding_debt_before": round(total_liabilities, 2),
                "outstanding_debt_after": round(new_liabilities, 2),
                "estimated_annual_interest_saved": round(est_annual_interest_saved, 2)
            },
            "metrics_before": {
                "total_liabilities": round(total_liabilities, 2),
                "liquid_savings": round(liquid_savings, 2),
                "net_worth": round(net_worth, 2)
            },
            "metrics_after": {
                "total_liabilities": round(new_liabilities, 2),
                "liquid_savings": round(new_liquid, 2),
                "net_worth": round(net_worth, 2) # Net worth neutral, but interest drag eliminated
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "debt_before": round(total_liabilities, 2),
                "debt_after": round(new_liabilities, 2),
                "est_annual_interest_saved": round(est_annual_interest_saved, 2)
            }
        }

    # -------------------------------------------------------------
    # 5. INCREASED SAVINGS / GOAL ACCELERATION
    # -------------------------------------------------------------
    elif scenario_type == "savings_increase":
        extra_monthly = float(amount)
        annual_addition = extra_monthly * 12.0
        new_monthly_savings = (monthly_income - monthly_expenses) + extra_monthly
        new_savings_rate = (new_monthly_savings / monthly_income * 100.0) if monthly_income > 0 else 0.0

        status = "positive"
        summary = (
            f"Saving an additional ₹{extra_monthly:,.2f} per month compounds to ₹{annual_addition:,.2f} extra saved per year, "
            f"raising your projected savings rate to {new_savings_rate:.1f}%."
        )

        recommendations = [
            f"Automate an recurring transfer or SIP of ₹{extra_monthly:,.2f} on the day after your salary credit.",
            f"Assign this surplus to specific high-priority goals (e.g. emergency fund or down payment)."
        ]

        return {
            "scenario_type": scenario_type,
            "title": f"Accelerated Monthly Savings (+₹{extra_monthly:,.2f}/mo)",
            "status": status,
            "summary": summary,
            "details": {
                "extra_monthly_savings": round(extra_monthly, 2),
                "extra_annual_savings": round(annual_addition, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            },
            "metrics_before": {
                "monthly_savings": round(monthly_income - monthly_expenses, 2),
                "savings_rate": round(current_savings_rate, 2)
            },
            "metrics_after": {
                "monthly_savings": round(new_monthly_savings, 2),
                "savings_rate": round(new_savings_rate, 2)
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "extra_monthly": round(extra_monthly, 2),
                "annual_addition": round(annual_addition, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            }
        }

    # -------------------------------------------------------------
    # 6. NEW EMI / LOAN COMMITMENT
    # -------------------------------------------------------------
    elif scenario_type == "new_emi":
        emi_amt = float(amount)
        current_monthly_debt = analytics.get("total_monthly_debt", 0.0)
        new_monthly_debt = current_monthly_debt + emi_amt
        new_debt_to_income = (new_monthly_debt / monthly_income * 100.0) if monthly_income > 0 else 100.0

        current_savings = monthly_income - monthly_expenses
        new_monthly_savings = current_savings - emi_amt
        new_savings_rate = (new_monthly_savings / monthly_income * 100.0) if monthly_income > 0 else 0.0
        annual_emi_commitment = emi_amt * 12.0

        # Goal impact: Calculate delay on primary goals
        goal_impacts = []
        for g in goals[:3]:
            rem_amt = float(g.get("remaining_amount") or (float(g.get("target_amount", 0.0)) - float(g.get("current_amount", 0.0))))
            if rem_amt > 0:
                months_current = (rem_amt / current_savings) if current_savings > 0 else 999
                months_new = (rem_amt / new_monthly_savings) if new_monthly_savings > 0 else 999
                delay = max(0, round(months_new - months_current, 1))
                goal_impacts.append({
                    "goal_name": g.get("name"),
                    "months_before": round(months_current, 1),
                    "months_after": round(months_new, 1),
                    "delay_months": delay
                })

        if new_monthly_savings < 0:
            status = "not_advisable"
            summary = (
                f"Not advisable. Adding an EMI of ₹{emi_amt:,.2f}/month creates a negative monthly cash flow "
                f"deficit of ₹{abs(new_monthly_savings):,.2f}/month. Debt-to-income jumps to {new_debt_to_income:.1f}%."
            )
        elif new_debt_to_income > 40.0 or new_savings_rate < 10.0:
            status = "caution"
            summary = (
                f"Proceed with caution. A new EMI of ₹{emi_amt:,.2f}/month raises your debt-to-income ratio to {new_debt_to_income:.1f}% "
                f"and drops your monthly savings from ₹{current_savings:,.2f} down to ₹{new_monthly_savings:,.2f} (savings rate: {new_savings_rate:.1f}%)."
            )
        else:
            status = "affordable"
            summary = (
                f"Affordable. You can take on this EMI of ₹{emi_amt:,.2f}/month ({item_name}). Your debt-to-income remains healthy "
                f"at {new_debt_to_income:.1f}% and monthly savings will be ₹{new_monthly_savings:,.2f}."
            )

        recommendations = [
            f"Annual EMI outflow is ₹{annual_emi_commitment:,.2f}.",
            f"Ensure loan interest rate is below 12% and tenure fits your long-term career stability."
        ]
        if goal_impacts:
            for gi in goal_impacts:
                if gi["delay_months"] > 0:
                    recommendations.append(f"Notice: This EMI delays your '{gi['goal_name']}' target milestone by approx {gi['delay_months']} months.")

        return {
            "scenario_type": scenario_type,
            "title": f"New EMI Commitment: {item_name} (₹{emi_amt:,.2f}/mo)",
            "status": status,
            "summary": summary,
            "details": {
                "emi_amount": round(emi_amt, 2),
                "annual_commitment": round(annual_emi_commitment, 2),
                "debt_to_income_before": round(analytics.get("debt_to_income_ratio", 0.0), 2),
                "debt_to_income_after": round(new_debt_to_income, 2),
                "new_monthly_savings": round(new_monthly_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2),
                "goal_impacts": goal_impacts
            },
            "metrics_before": {
                "monthly_debt": round(current_monthly_debt, 2),
                "debt_to_income": round(analytics.get("debt_to_income_ratio", 0.0), 2),
                "monthly_savings": round(current_savings, 2),
                "savings_rate": round(current_savings_rate, 2)
            },
            "metrics_after": {
                "monthly_debt": round(new_monthly_debt, 2),
                "debt_to_income": round(new_debt_to_income, 2),
                "monthly_savings": round(new_monthly_savings, 2),
                "savings_rate": round(new_savings_rate, 2)
            },
            "recommendations": recommendations,
            "authoritative_math": {
                "emi_amount": round(emi_amt, 2),
                "new_debt_to_income": round(new_debt_to_income, 2),
                "new_monthly_savings": round(new_monthly_savings, 2),
                "new_savings_rate": round(new_savings_rate, 2)
            }
        }

    else:
        return {
            "scenario_type": scenario_type,
            "title": "Scenario Analysis",
            "status": "neutral",
            "summary": "Unsupported scenario type requested.",
            "details": {},
            "metrics_before": {},
            "metrics_after": {},
            "recommendations": [],
            "authoritative_math": {}
        }
