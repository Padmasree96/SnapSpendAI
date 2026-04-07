from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    limit_amount = Column(Float, nullable=False)
    spent = Column(Float, default=0.0)
    month = Column(String(10), nullable=False)  # YYYY-MM
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="budgets")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "category": self.category,
            "limit": self.limit_amount,
            "spent": self.spent,
            "month": self.month,
        }
