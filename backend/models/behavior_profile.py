from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class BehaviorProfile(Base):
    __tablename__ = "behavior_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    month = Column(String(10), nullable=False)  # YYYY-MM
    personality_type = Column(String(50), nullable=True)
    personality_score = Column(Integer, nullable=True)
    lifestyle_type = Column(String(50), nullable=True)
    impulse_risk_score = Column(Integer, nullable=True)
    profile_data = Column(Text, default="{}")  # Full JSON profiling data
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="behavior_profiles")

    def to_dict(self) -> dict:
        import json
        try:
            data = json.loads(self.profile_data)
        except (json.JSONDecodeError, TypeError):
            data = {}
        return {
            "id": str(self.id),
            "month": self.month,
            "personalityType": self.personality_type,
            "personalityScore": self.personality_score,
            "lifestyleType": self.lifestyle_type,
            "impulseRiskScore": self.impulse_risk_score,
            "profileData": data,
        }
