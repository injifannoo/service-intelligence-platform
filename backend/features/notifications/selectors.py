"""Notification query selectors."""

from django.db.models import QuerySet
from .models import Notification


def get_user_notifications(*, user) -> QuerySet[Notification]:
    """Returns all notifications for a specific user."""
    return Notification.objects.filter(user=user)


def get_unread_notification_count(*, user) -> int:
    """Returns the count of unread notifications for a user."""
    return Notification.objects.filter(user=user, is_read=False).count()


def get_notification_by_id(notification_id, *, user) -> Notification | None:
    """Returns a specific notification belonging to the user."""
    return Notification.objects.filter(pk=notification_id, user=user).first()