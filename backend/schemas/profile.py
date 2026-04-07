from pydantic import BaseModel, field_validator
from typing import Optional


class ChatMessageRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        if len(cleaned) > 4000:
            raise ValueError("Message is too long")
        return cleaned


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = None
    language: Optional[str] = None
    aiPreferences: Optional[dict] = None


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
