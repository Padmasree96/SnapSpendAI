from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(30), nullable=False)  # budget, bill, warning, ai, lifestyle
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="info")  # info, warning, danger
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")

    def to_dict(self) -> dict:
        from datetime import datetime as dt

        now = dt.utcnow()
        diff = now - self.created_at if self.created_at else None
        if diff:
            hours = int(diff.total_seconds() / 3600)
            if hours < 1:
                time_str = "Just now"
            elif hours < 24:
                time_str = f"{hours} hours ago"
            else:
                days = hours // 24
                time_str = f'{days} day{"s" if days > 1 else ""} ago'
        else:
            time_str = "Unknown"

        return {
            "id": str(self.id),
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "read": self.read,
            "time": time_str,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(10), nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_messages")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "role": self.role,
            "content": self.content,
            "timestamp": self.created_at.strftime("%I:%M %p") if self.created_at else "",
        }
