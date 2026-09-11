import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

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

    # Prepare Gemini Request
    # Use Gemini 2.5 Flash or Gemini 1.5 Flash via REST endpoint
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    # Format messages
    contents = []
    
    # Format context facts as initial system preamble
    context_str = json.dumps(structured_context, indent=2)
    system_instruction_payload = {
        "parts": [
            {"text": f"{SYSTEM_PROMPT}\n\nUSER'S CURRENT FINANCIAL DATA & AUTHORITATIVE CALCULATIONS:\n```json\n{context_str}\n```"}
        ]
    }

    # Add conversation history
    for msg in conversation_history[-8:]: # keep last 8 messages for context
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })

    # Append the latest user query
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "system_instruction": system_instruction_payload,
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1024,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            
            # If 2.5 is not available in that region or key, fallback to 1.5-flash
            if resp.status_code == 404 or resp.status_code == 400:
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                resp = await client.post(fallback_url, json=payload)

            if resp.status_code != 200:
                logger.error(f"Gemini API returned error {resp.status_code}: {resp.text}")
                return {
                    "content": (
                        "I was unable to consult the AI model at this moment due to an API response issue. "
                        "However, your authoritative financial metrics remain safe and accessible."
                    ),
                    "structured_data": structured_context.get("authoritative_scenario_calculation"),
                    "suggested_follow_ups": ["Check my financial health score", "View my top expenses"]
                }

            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                text_response = "".join(p.get("text", "") for p in parts)
                
                # Dynamic follow up suggestions
                follow_ups = []
                if "afford" in user_message.lower():
                    follow_ups = [
                        "What if I buy it on a 6-month zero cost EMI?",
                        "How long will it take to replenish my emergency fund?",
                        "What expenses can I cut next month?"
                    ]
                elif "habit" in user_message.lower() or "overspend" in user_message.lower():
                    follow_ups = [
                        "Show my subscriptions breakdown",
                        "How much did I spend on dining out?",
                        "What is my current savings rate?"
                    ]
                else:
                    follow_ups = [
                        "Can I afford a major purchase?",
                        "What if my rent increases by ₹5,000?",
                        "How is my emergency fund doing?"
                    ]

                return {
                    "content": text_response,
                    "structured_data": structured_context.get("authoritative_scenario_calculation"),
                    "suggested_follow_ups": follow_ups
                }
            else:
                return {
                    "content": "No response text was generated by the model. Please try asking in a different way.",
                    "structured_data": structured_context.get("authoritative_scenario_calculation"),
                    "suggested_follow_ups": []
                }

    except Exception as e:
        logger.error(f"Exception calling Gemini API: {e}")
        return {
            "content": f"A connection error occurred while contacting the AI service: {str(e)}",
            "structured_data": structured_context.get("authoritative_scenario_calculation"),
            "suggested_follow_ups": ["Retry asking question", "View dashboard summary"]
        }
