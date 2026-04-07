"""
Continuous Learning Service for SnapSpend AI.
Tracks user feedback (OCR corrections, category corrections) and uses them
to improve future predictions.
"""

import json
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.feedback import Feedback
from services.ai_engine import CATEGORY_KEYWORDS


def record_feedback(user_id: int, feedback_type: str, original: str, corrected: str, context: dict, db: Session) -> Feedback:
    """Record a user feedback entry."""
    fb = Feedback(
        user_id=user_id,
        feedback_type=feedback_type,
        original_value=original,
        corrected_value=corrected,
        context=json.dumps(context),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


def get_user_category_overrides(user_id: int, db: Session) -> dict:
    """
    Build a keyword→category mapping from the user's past category corrections.
    These override the default CATEGORY_KEYWORDS for this specific user.
    """
    corrections = db.query(Feedback).filter(
        Feedback.user_id == user_id,
        Feedback.feedback_type == "category_correction",
    ).all()

    overrides = {}
    for fb in corrections:
        try:
            ctx = json.loads(fb.context)
            description = ctx.get("description", "").lower()
            if description:
                # Map keywords from the description to the corrected category
                words = description.split()
                for word in words:
                    if len(word) > 3:  # Only meaningful words
                        overrides[word] = fb.corrected_value
        except (json.JSONDecodeError, TypeError):
            pass

    return overrides


def detect_category_with_learning(text: str, user_id: int, db: Session) -> str:
    """
    Detect category using both default rules and user-specific learned corrections.
    User corrections take priority over default keywords.
    """
    text_lower = text.lower()

    # Check user-specific overrides first
    overrides = get_user_category_overrides(user_id, db)
    for keyword, category in overrides.items():
        if keyword in text_lower:
            return category

    # Fall back to default keyword matching
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category

    return "others"


def get_feedback_stats(user_id: int, db: Session) -> dict:
    """Get feedback statistics for a user."""
    total = db.query(func.count(Feedback.id)).filter(Feedback.user_id == user_id).scalar() or 0
    ocr_corrections = db.query(func.count(Feedback.id)).filter(
        Feedback.user_id == user_id,
        Feedback.feedback_type == "ocr_correction",
    ).scalar() or 0
    category_corrections = db.query(func.count(Feedback.id)).filter(
        Feedback.user_id == user_id,
        Feedback.feedback_type == "category_correction",
    ).scalar() or 0

    # Most corrected categories
    category_counts = db.query(
        Feedback.corrected_value, func.count(Feedback.id)
    ).filter(
        Feedback.user_id == user_id,
        Feedback.feedback_type == "category_correction",
    ).group_by(Feedback.corrected_value).order_by(func.count(Feedback.id).desc()).limit(5).all()

    return {
        "totalFeedback": total,
        "ocrCorrections": ocr_corrections,
        "categoryCorrections": category_corrections,
        "topCorrectedCategories": [{"category": cat, "count": count} for cat, count in category_counts],
        "learningStatus": "Active" if total > 0 else "No data yet",
    }
