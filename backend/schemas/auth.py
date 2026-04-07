from pydantic import BaseModel, field_validator
from typing import Optional


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Email is required")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Email is required")
        return v.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Email is required")
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class RefreshTokenRequest(BaseModel):
    refreshToken: str


class LogoutRequest(BaseModel):
    refreshToken: Optional[str] = None
    allDevices: Optional[bool] = False
