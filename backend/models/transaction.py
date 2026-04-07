from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # 'expense' or 'income'
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    image_path = Column(String(500), nullable=True)
    ai_detected = Column(Boolean, default=False)
    confidence = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "type": self.type,
            "amount": self.amount,
            "category": self.category,
            "description": self.description,
            "date": self.date,
            "account": str(self.account_id) if self.account_id else None,
            "image": self.image_path,
            "aiDetected": self.ai_detected,
            "confidence": self.confidence,
            "notes": self.notes,
        }
