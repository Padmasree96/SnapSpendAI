from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.transaction import Transaction
from models.income import Income
from models.behavior_profile import BehaviorProfile
from services.auth_service import get_current_user
from services.behavior_engine import generate_full_profile
from services.gemini_service import generate_behavior_analysis

import json
from datetime import datetime

router = APIRouter(prefix="/api/insights", tags=["Behavior & Lifestyle Profiling"])


@router.get("")
def get_insights(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-powered spending personality, lifestyle, habit, and risk insights."""
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    incomes = db.query(Income).filter(Income.user_id == user.id).all()

    # Generate profile using behavior engine
    profile = generate_full_profile(transactions, incomes)

    # Try to enrich with Gemini AI analysis
    if transactions:
        total_income = profile["financialHealth"]["totalIncome"]
        total_expenses = profile["financialHealth"]["totalExpenses"]
        summary_text = f"Income: ${total_income:,.2f}, Expenses: ${total_expenses:,.2f}, Savings rate: {profile['financialHealth']['savingsRate']}%"
        ai_analysis = generate_behavior_analysis(summary_text)
        if ai_analysis:
            profile["aiAnalysis"] = ai_analysis

    # Cache the profile
    current_month = datetime.utcnow().strftime("%Y-%m")
    existing = db.query(BehaviorProfile).filter(
        BehaviorProfile.user_id == user.id,
        BehaviorProfile.month == current_month,
    ).first()

    if existing:
        existing.personality_type = profile["spendingPersonality"]["type"]
        existing.personality_score = profile["spendingPersonality"]["score"]
        existing.lifestyle_type = profile["lifestyleType"]["type"]
        existing.impulse_risk_score = profile["impulsiveBuyingRisk"]["score"]
        existing.profile_data = json.dumps(profile)
    else:
        bp = BehaviorProfile(
            user_id=user.id,
            month=current_month,
            personality_type=profile["spendingPersonality"]["type"],
            personality_score=profile["spendingPersonality"]["score"],
            lifestyle_type=profile["lifestyleType"]["type"],
            impulse_risk_score=profile["impulsiveBuyingRisk"]["score"],
            profile_data=json.dumps(profile),
        )
        db.add(bp)
    db.commit()

    return profile


@router.get("/trends")
def get_insight_trends(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get historical behavior profile trends across months."""
    profiles = db.query(BehaviorProfile).filter(
        BehaviorProfile.user_id == user.id,
    ).order_by(BehaviorProfile.month.asc()).all()

    return [p.to_dict() for p in profiles]
