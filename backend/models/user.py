from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
import bcrypt
from datetime import datetime
import json

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="user")  # user, admin
    currency = Column(String(10), default="USD")
    language = Column(String(10), default="en")
    phone = Column(String(20), nullable=True)
    ai_preferences = Column(Text, default="{}")
    reset_token = Column(String(256), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    incomes = relationship("Income", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    behavior_profiles = relationship("BehaviorProfile", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def get_ai_preferences(self) -> dict:
        try:
            return json.loads(self.ai_preferences)
        except (json.JSONDecodeError, TypeError):
            return {
                "spendingAlerts": True,
                "savingsTips": True,
                "weeklyDigest": True,
                "lifestyleInsights": True,
            }

    def set_ai_preferences(self, prefs: dict):
        self.ai_preferences = json.dumps(prefs)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "currency": self.currency,
            "language": self.language,
            "phone": self.phone,
            "role": self.role,
            "avatar": None,
            "aiPreferences": self.get_ai_preferences(),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
