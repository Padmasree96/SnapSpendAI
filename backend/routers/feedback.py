from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.feedback import FeedbackCreate
from services.auth_service import get_current_user
from services.learning_service import record_feedback, get_feedback_stats

router = APIRouter(prefix="/api/feedback", tags=["Continuous Learning"])


@router.post("/ocr", status_code=201)
def submit_ocr_feedback(
    data: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an OCR correction to improve future accuracy."""
    fb = record_feedback(
        user_id=user.id,
        feedback_type="ocr_correction",
        original=data.originalValue,
        corrected=data.correctedValue,
        context=data.context or {},
        db=db,
    )
    return {"success": True, "feedback": fb.to_dict()}


@router.post("/category", status_code=201)
def submit_category_feedback(
    data: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a category correction to improve future classification."""
    fb = record_feedback(
        user_id=user.id,
        feedback_type="category_correction",
        original=data.originalValue,
        corrected=data.correctedValue,
        context=data.context or {},
        db=db,
    )
    return {"success": True, "feedback": fb.to_dict()}


@router.get("/stats")
def feedback_statistics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get feedback and learning statistics."""
    return get_feedback_stats(user.id, db)
