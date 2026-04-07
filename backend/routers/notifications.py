from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import traceback

from database import get_db
from models.user import User
from models.notification import Notification
from services.auth_service import get_current_user
from services.notification_service import sync_notifications_for_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate current notifications from user data and list all notifications, newest first."""
    try:
        sync_notifications_for_user(user.id, db)
    except Exception:
        traceback.print_exc()

    notifications = db.query(Notification).filter(
        Notification.user_id == user.id,
    ).order_by(Notification.created_at.desc()).all()
    return [n.to_dict() for n in notifications]


@router.post("/generate")
def trigger_notification_generation(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger notification generation (budget alerts, low balance, etc.)."""
    generated = sync_notifications_for_user(user.id, db)
    return {
        "success": True,
        "generated": len(generated),
        "message": f"Generated {len(generated)} new notifications",
    }


@router.put("/{notification_id}/read")
def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail={"message": "Notification not found"})

    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification.to_dict()


@router.put("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail={"message": "Notification not found"})

    db.delete(notification)
    db.commit()
    return {"success": True, "message": "Notification deleted"}
