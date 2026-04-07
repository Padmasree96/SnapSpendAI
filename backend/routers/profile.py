from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.profile import ProfileUpdate, PasswordChange
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/profile", tags=["User Profile"])


@router.get("")
def get_profile(
    user: User = Depends(get_current_user),
):
    """Get the current user's profile."""
    return user.to_dict()


@router.put("")
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    if data.name is not None:
        user.name = data.name
    if data.email is not None:
        # Check if email is taken
        existing = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail={"message": "Email already in use"})
        user.email = data.email
    if data.currency is not None:
        user.currency = data.currency
    if data.language is not None:
        user.language = data.language
    if data.aiPreferences is not None:
        user.set_ai_preferences(data.aiPreferences)

    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.put("/password")
def change_password(
    data: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password."""
    if len(data.newPassword) < 6:
        raise HTTPException(status_code=400, detail={"message": "Password must be at least 6 characters"})
    if not user.check_password(data.currentPassword):
        raise HTTPException(status_code=401, detail={"message": "Current password is incorrect"})

    user.set_password(data.newPassword)
    db.commit()
    return {"success": True, "message": "Password changed successfully"}
