from django.conf import settings
from django.db import models
from core.base_models import BaseModel


class Notification(BaseModel):
    class NotificationType(models.TextChoices):
        BOOKING_UPDATE = "booking_update", "Booking Update"
        REVIEW_RECEIVED = "review_received", "Review Received"
        SYSTEM_ALERT = "system_alert", "System Alert"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM_ALERT,
    )
    is_read = models.BooleanField(default=False, db_index=True)
    related_object_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.user.email}: {self.title} ({'Read' if self.is_read else 'Unread'})"