"""Notification business logic and mutations."""

from django.db import transaction
from features.users.models import User
from .models import Notification


@transaction.atomic
def create_notification(
    *,
    user: User,
    title: str,
    message: str,
    notification_type: str = Notification.NotificationType.SYSTEM_ALERT,
    related_object_id=None,
) -> Notification:
    """Creates a new user notification."""
    return Notification.objects.create(
        user=user,
        title=title.strip(),
        message=message.strip(),
        notification_type=notification_type,
        related_object_id=related_object_id,
    )


@transaction.atomic
def mark_notification_as_read(*, notification: Notification) -> Notification:
    """Marks a notification as read."""
    notification.is_read = True
    notification.save(update_fields=["is_read", "updated_at"])
    return notification


@transaction.atomic
def mark_all_notifications_as_read(*, user) -> int:
    """Marks all unread notifications as read for a user."""
    return Notification.objects.filter(user=user, is_read=False).update(is_read=True)