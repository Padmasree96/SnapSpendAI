from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models.user import User
from models.account import Account
from schemas.auth import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, RefreshTokenRequest, LogoutRequest,
)
from services.auth_service import (
    create_access_token, get_current_user,
    create_refresh_token, verify_refresh_token, revoke_refresh_token,
    revoke_all_user_tokens, generate_reset_token,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail={"message": "Email already registered"})

    user = User(name=data.name, email=data.email)
    user.set_password(data.password)
    user.set_ai_preferences({
        "spendingAlerts": True,
        "savingsTips": True,
        "weeklyDigest": True,
        "lifestyleInsights": True,
    })
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id, db)
    return {
        "success": True,
        "token": access_token,
        "refreshToken": refresh_token,
        "user": user.to_dict(),
    }


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.check_password(data.password):
        raise HTTPException(status_code=401, detail={"message": "Invalid credentials"})

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id, db)
    return {
        "success": True,
        "token": access_token,
        "refreshToken": refresh_token,
        "user": user.to_dict(),
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Return success even if user not found to prevent email enumeration
        return {"success": True, "message": "If the email exists, a reset token has been generated"}

    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    # In production, send email with token. For now, return token directly.
    return {
        "success": True,
        "message": "Reset token generated. Use it to reset your password.",
        "resetToken": token,  # In production, remove this and send via email
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    if not data.token:
        raise HTTPException(status_code=400, detail={"message": "Reset token is required"})

    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail={"message": "Invalid reset token"})

    if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail={"message": "Reset token has expired"})

    user.set_password(data.password)
    user.reset_token = None
    user.reset_token_expiry = None
    # Revoke all existing refresh tokens for security
    revoke_all_user_tokens(user.id, db)
    db.commit()
    return {"success": True, "message": "Password reset successfully"}


@router.post("/refresh")
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh the JWT access token using a refresh token (rotation)."""
    db_token = verify_refresh_token(data.refreshToken, db)
    if not db_token:
        raise HTTPException(status_code=401, detail={"message": "Invalid or expired refresh token"})

    # Rotate: revoke old, issue new
    revoke_refresh_token(data.refreshToken, db)
    new_access = create_access_token(db_token.user_id)
    new_refresh = create_refresh_token(db_token.user_id, db)
    return {
        "success": True,
        "token": new_access,
        "refreshToken": new_refresh,
    }


@router.post("/logout")
def logout(data: LogoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout and revoke the refresh token."""
    if data.refreshToken:
        revoke_refresh_token(data.refreshToken, db)
    if data.allDevices:
        revoke_all_user_tokens(user.id, db)
    return {"success": True, "message": "Logged out successfully"}
