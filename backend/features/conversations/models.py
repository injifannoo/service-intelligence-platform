from django.conf import settings
from django.db import models

from core.base_models import BaseModel


class ConversationStatus(models.TextChoices):
    OPEN = "open", "Open"
    ARCHIVED = "archived", "Archived"
    RESOLVED = "resolved", "Resolved"


class Conversation(BaseModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.SET_NULL,
        related_name="conversations",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.OPEN,
        db_index=True,
    )

    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.email} -> {self.organization.name}"


class Message(BaseModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_sent",
    )
    body = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "conversation_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender.email} in {self.conversation_id}"


class RequestType(models.TextChoices):
    QUOTE = "quote", "Quote"
    BOOKING = "booking", "Booking"
    GENERAL = "general", "General"


class ServiceRequestStatus(models.TextChoices):
    NEW = "new", "New"
    IN_REVIEW = "in_review", "In review"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    BOOKED = "booked", "Booked"


class ServiceRequest(BaseModel):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="service_requests",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_requests",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.SET_NULL,
        related_name="service_requests",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=255, blank=True, default="")
    request_type = models.CharField(
        max_length=20,
        choices=RequestType.choices,
        default=RequestType.QUOTE,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=ServiceRequestStatus.choices,
        default=ServiceRequestStatus.NEW,
        db_index=True,
    )
    preferred_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    message = models.TextField(blank=True, default="")
    contact_name = models.CharField(max_length=255, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    contact_phone = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "service_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request_type.title()} request: {self.organization.name}"
