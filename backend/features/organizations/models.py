from django.conf import settings
from django.db import models

from core.base_models import BaseModel


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "UNVERIFIED", "Unverified"
    PENDING = "PENDING", "Pending"
    VERIFIED = "VERIFIED", "Verified"
    REJECTED = "REJECTED", "Rejected"


class Industry(BaseModel):
    """Categorizes organizations (docs/04_Database_Design.md:290-305)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "industries"
        verbose_name_plural = "industries"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Organization(BaseModel):
    """Registered service providers (docs/04_Database_Design.md:272-288)."""

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default="")
    industry = models.ForeignKey(
        Industry,
        on_delete=models.PROTECT,
        related_name="organizations",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_organizations",
        null=True,
        blank=True,
    )
    location = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    website = models.URLField(max_length=255, blank=True, default="")
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
        db_index=True,
    )

    class Meta:
        db_table = "organizations"
        ordering = ["name"]

    def __str__(self):
        return self.name