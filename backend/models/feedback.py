from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    feedback_type = Column(String(30), nullable=False)  # ocr_correction, category_correction
    original_value = Column(String(255), nullable=False)
    corrected_value = Column(String(255), nullable=False)
    context = Column(Text, default="{}")  # Additional context as JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="feedbacks")

    def to_dict(self) -> dict:
        import json
        try:
            ctx = json.loads(self.context)
        except (json.JSONDecodeError, TypeError):
            ctx = {}
        return {
            "id": str(self.id),
            "feedbackType": self.feedback_type,
            "originalValue": self.original_value,
            "correctedValue": self.corrected_value,
            "context": ctx,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
