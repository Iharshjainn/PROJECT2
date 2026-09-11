from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime
from app.core.security import get_current_user, AuthenticatedUser
from app.services.data_service import DataService
from app.services.analytics_service import calculate_analytics_summary
from app.services.financial_health_service import calculate_financial_health_score
from app.services.context_builder import build_ai_context
from app.services.gemini_service import generate_chat_response
from app.schemas.analytics import ChatMessageRequest, ChatMessageResponse, ConversationItem

router = APIRouter(prefix="/chat", tags=["AI Advisor"])

@router.get("/conversations", response_model=List[Dict[str, Any]])
async def list_conversations(user: AuthenticatedUser = Depends(get_current_user)):
    """Lists all chat conversations for the authenticated user."""
    db = DataService(user.id)
    return await db.get_conversations()

@router.post("/conversations", response_model=Dict[str, Any])
async def create_conversation(
    title: str = "New Financial Discussion",
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new conversation thread."""
    db = DataService(user.id)
    return await db.create_conversation(title=title)

@router.get("/conversations/{conversation_id}/messages", response_model=List[Dict[str, Any]])
async def get_conversation_messages(
    conversation_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves full message history for a conversation thread."""
    db = DataService(user.id)
    return await db.get_messages(conversation_id)

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a conversation thread and all its messages."""
    db = DataService(user.id)
    success = await db.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized")
    return {"message": "Conversation deleted successfully"}

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    req: ChatMessageRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Core AI Financial Advisor pipeline:
    1. Authenticate user.
    2. Retrieve conversation thread (or create a new one).
    3. Save user message.
    4. Fetch user's financial dataset (transactions, accounts, assets, liabilities, goals).
    5. Run deterministic financial calculations (analytics, health score, scenario logic).
    6. Build targeted AI context grounded on Python arithmetic.
    7. Generate AI explanation via Gemini.
    8. Save assistant response.
    9. Return result to user with follow-ups.
    """
    db = DataService(user.id)
    
    # 1. Resolve conversation thread
    conv_id = req.conversation_id
    if not conv_id:
        # Title from first 5 words of message
        title_words = req.message.strip().split()[:5]
        title = " ".join(title_words).capitalize() or "Financial Consultation"
        conv = await db.create_conversation(title=title)
        conv_id = conv["id"]

    # 2. Record user message
    await db.add_message(conv_id, "user", req.message)

    # 3. Retrieve prior messages for conversational memory
    history = await db.get_messages(conv_id)

    # 4. Fetch user's financial records
    transactions = await db.get_transactions(limit=500)
    assets = await db.get_assets()
    liabilities = await db.get_liabilities()
    goals = await db.get_goals()

    # 5. Authoritative calculations
    analytics = calculate_analytics_summary(transactions, assets, liabilities)
    health = calculate_financial_health_score(analytics)

    # 6. Build targeted context
    ai_context = build_ai_context(
        user_message=req.message,
        analytics=analytics,
        transactions=transactions,
        goals=goals,
        assets=assets,
        liabilities=liabilities,
        health_score=health
    )

    # 7. Query Gemini for natural language explanation
    ai_result = await generate_chat_response(
        user_message=req.message,
        conversation_history=history[:-1], # prior history before this message
        structured_context=ai_context
    )

    # 8. Record assistant response
    assistant_msg = await db.add_message(conv_id, "assistant", ai_result["content"])

    return {
        "conversation_id": conv_id,
        "message_id": assistant_msg["id"],
        "role": "assistant",
        "content": ai_result["content"],
        "structured_data": ai_result.get("structured_data"),
        "suggested_follow_ups": ai_result.get("suggested_follow_ups", []),
        "created_at": datetime.now()
    }
