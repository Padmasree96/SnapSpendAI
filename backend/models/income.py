from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    source = Column(String(50), nullable=False)  # salary, freelance, investment, rental, business, other
    category = Column(String(50), nullable=False, default="general")
    description = Column(String(255), nullable=False)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    recurring = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="incomes")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "amount": self.amount,
            "source": self.source,
            "category": self.category,
            "description": self.description,
            "date": self.date,
            "recurring": self.recurring,
            "notes": self.notes,
        }
