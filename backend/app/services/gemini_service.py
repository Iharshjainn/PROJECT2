import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intelligent, empathetic, and prudent AI Personal Financial Health Advisor.
Your mission is to help the user understand their finances, build healthy habits, and make sound financial decisions.

CRITICAL ARCHITECTURAL PRINCIPLES:
1. AUTHORITATIVE BACKEND CALCULATION ENGINE:
   - All income, expenses, savings, savings rates, net worth, debt burdens, and scenario calculations provided in your context are deterministically computed by the Python backend.
   - You MUST NOT dispute, re-calculate with different formulas, or invent alternative figures.
   - You MUST ground all explanations on these exact numbers.
   - If a scenario calculation (e.g., affordability of an iPhone or major purchase) is included in the context, explain the exact metrics computed: liquid savings before/after, emergency runway months before/after, and status (affordable, caution, or not advisable).

2. GROUNDING & HONESTY:
   - Base your advice strictly on the user's provided data.
   - Do NOT say "I looked into your live bank account." Instead say: "Based on the transactions and accounts you have recorded..."
   - If the user asks about something missing from their data (e.g. missing income or no recorded assets), gently mention that adding that data will make the analysis more complete.

3. COMMUNICATION STYLE:
   - Clear, trustworthy, concise, and actionable.
   - Highlight key monetary values in bold (e.g., **₹80,000** or **3.2 months**).
   - Offer 1-2 thoughtful follow-up questions or actionable next steps.
   - Keep answers focused; avoid unnecessary financial jargon.
   - Remind the user when relevant that your advice is for personal financial wellness and educational guidance, not formal statutory investment advice.
"""

def _build_follow_ups(user_message: str) -> List[str]:
    msg_lower = user_message.lower()
    if "afford" in msg_lower:
        return [
            "What if I buy it on a 6-month zero cost EMI?",
            "How long will it take to replenish my emergency fund?",
            "What expenses can I cut next month?"
        ]
    elif "habit" in msg_lower or "overspend" in msg_lower:
        return [
            "Show my subscriptions breakdown",
            "How much did I spend on dining out?",
            "What is my current savings rate?"
        ]
    else:
        return [
            "Can I afford a major purchase?",
            "What if my rent increases by ₹5,000?",
            "How is my emergency fund doing?"
        ]

async def generate_chat_response(
    user_message: str,
    conversation_history: List[Dict[str, str]],
    structured_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Sends conversational history and structured financial facts to Gemini API.
    Returns generated content and suggested follow-ups.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    
    # If API key is not configured, generate a graceful, data-grounded fallback
    if not api_key or api_key == "your_gemini_api_key_here":
        scenario = structured_context.get("authoritative_scenario_calculation")
        if scenario:
            content = (
                f"### {scenario.get('title')}\n\n"
                f"**Status:** {scenario.get('status').replace('_', ' ').title()}\n\n"
                f"{scenario.get('summary')}\n\n"
                f"**Authoritative Numbers:**\n"
                f"- Before: Liquid Savings ₹{scenario['metrics_before'].get('liquid_savings', 0):,.2f} "
                f"({scenario['metrics_before'].get('emergency_months', 0):.2f} months emergency coverage)\n"
                f"- After: Liquid Savings ₹{scenario['metrics_after'].get('liquid_savings', 0):,.2f} "
                f"({scenario['metrics_after'].get('emergency_months', 0):.2f} months emergency coverage)\n\n"
                f"*Note: Configure `GEMINI_API_KEY` in backend environment for full conversational AI reasoning.*"
            )
        else:
            profile = structured_context.get("user_financial_profile", {})
            content = (
                f"Based on your recorded financial data:\n\n"
                f"- **Monthly Income:** ₹{profile.get('monthly_income', 0):,.2f}\n"
                f"- **Monthly Expenses:** ₹{profile.get('monthly_expenses', 0):,.2f}\n"
                f"- **Savings Rate:** {profile.get('savings_rate_pct', 0):.1f}%\n"
                f"- **Financial Health Score:** {profile.get('financial_health_score', 0)}/100 ({profile.get('financial_health_rating', 'Good')})\n\n"
                f"*To enable deep conversational AI interactions with Gemini, please provide the `GEMINI_API_KEY` backend secret.*"
            )
            
        return {
            "content": content,
            "structured_data": structured_context.get("authoritative_scenario_calculation"),
            "suggested_follow_ups": [
                "Can I afford an ₹80,000 purchase?",
                "Analyze my monthly spending",
                "How can I improve my health score?"
            ]
        }

    # Format context facts
    context_str = json.dumps(structured_context, indent=2)
    full_system_instruction = (
        f"{SYSTEM_PROMPT}\n\n"
        f"USER'S CURRENT FINANCIAL DATA & AUTHORITATIVE CALCULATIONS:\n"
        f"```json\n{context_str}\n```"
    )

    # Method 1: Use google-generativeai SDK with gemini-3.6-flash
    try:
        genai.configure(api_key=api_key)
        for model_name in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=full_system_instruction
                )
                
                # Format conversation history
                chat_history = []
                for msg in conversation_history[-6:]:
                    role = "user" if msg.get("role") == "user" else "model"
                    chat_history.append({"role": role, "parts": [msg.get("content", "")]})

                chat = model.start_chat(history=chat_history)
                response = chat.send_message(user_message)
                if response and response.text:
                    return {
                        "content": response.text.strip(),
                        "structured_data": structured_context.get("authoritative_scenario_calculation"),
                        "suggested_follow_ups": _build_follow_ups(user_message)
                    }
            except Exception as model_err:
                logger.warning(f"Failed with {model_name}: {model_err}")
                continue
    except Exception as sdk_err:
        logger.warning(f"SDK initialization failed, trying HTTP REST: {sdk_err}")

    # Method 2: Direct HTTP REST fallback
    for m in ["gemini-3.6-flash", "gemini-flash-latest"]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": full_system_instruction}]},
            "contents": [
                {"role": "user", "parts": [{"text": user_message}]}
            ],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024}
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        text_response = "".join(p.get("text", "") for p in parts)
                        return {
                            "content": text_response.strip(),
                            "structured_data": structured_context.get("authoritative_scenario_calculation"),
                            "suggested_follow_ups": _build_follow_ups(user_message)
                        }
        except Exception as http_err:
            logger.warning(f"HTTP REST call to {m} failed: {http_err}")

    # Safe fallback if AI endpoint experiences transient outage
    scenario = structured_context.get("authoritative_scenario_calculation")
    if scenario:
        content = (
            f"### {scenario.get('title')}\n\n"
            f"**Status:** {scenario.get('status').replace('_', ' ').title()}\n\n"
            f"{scenario.get('summary')}\n\n"
            f"**Authoritative Numbers:**\n"
            f"- Liquid Savings Before: ₹{scenario['metrics_before'].get('liquid_savings', 0):,.2f} "
            f"({scenario['metrics_before'].get('emergency_months', 0):.2f} months runway)\n"
            f"- Liquid Savings After: ₹{scenario['metrics_after'].get('liquid_savings', 0):,.2f} "
            f"({scenario['metrics_after'].get('emergency_months', 0):.2f} months runway)\n"
        )
    else:
        profile = structured_context.get("user_financial_profile", {})
        content = (
            f"Here is your current financial analysis:\n\n"
            f"- **Monthly Income:** ₹{profile.get('monthly_income', 0):,.2f}\n"
            f"- **Monthly Expenses:** ₹{profile.get('monthly_expenses', 0):,.2f}\n"
            f"- **Savings Rate:** {profile.get('savings_rate_pct', 0):.1f}%\n"
            f"- **Financial Health Score:** {profile.get('financial_health_score', 0)}/100 ({profile.get('financial_health_rating', 'Good')})"
        )

    return {
        "content": content,
        "structured_data": structured_context.get("authoritative_scenario_calculation"),
        "suggested_follow_ups": _build_follow_ups(user_message)
    }
