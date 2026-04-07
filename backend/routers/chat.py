from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.notification import ChatMessage
from schemas.profile import ChatMessageRequest
from services.auth_service import get_current_user
from services.ai_engine import ai_engine
from services.security_service import require_backend_api_key, validate_user_prompt
from services.voice_service import voice_service

router = APIRouter(prefix="/api/chat", tags=["AI Chat Assistant"])


@router.get("/history")
def get_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat conversation history."""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user.id,
    ).order_by(ChatMessage.created_at.asc()).all()

    if not messages:
        welcome = ChatMessage(
            user_id=user.id,
            role="ai",
            content="Hello! I'm your SnapSpend AI assistant. I can help you understand your finances, give spending advice, and provide personalized insights. What would you like to know?",
        )
        db.add(welcome)
        db.commit()
        db.refresh(welcome)
        messages = [welcome]

    return [m.to_dict() for m in messages]


@router.post("/message")
def send_message(
    data: ChatMessageRequest,
    _: None = Depends(require_backend_api_key),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and get a RAG-grounded AI response."""
    safe_content = validate_user_prompt(data.content)

    # Save user message
    user_msg = ChatMessage(user_id=user.id, role="user", content=safe_content)
    db.add(user_msg)

    # Use new RAG-enabled AI Engine
    try:
        ai_response = ai_engine.generate_chat_response(safe_content, user.id)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail={"message": str(exc)}) from exc

    # Generate voice response
    import uuid
    voice_filename = f"chat_{uuid.uuid4().hex[:8]}"
    voice_url = voice_service.generate_voice_response(ai_response, voice_filename)

    ai_msg = ChatMessage(user_id=user.id, role="ai", content=ai_response)
    db.add(ai_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(ai_msg)

    return {
        "userMessage": user_msg.to_dict(),
        "aiMessage": ai_msg.to_dict(),
        "voiceUrl": voice_url,
    }
