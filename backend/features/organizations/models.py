import uuid

from django.db import models


class VerificationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    VERIFIED = "VERIFIED", "Verified"
    REJECTED = "REJECTED", "Rejected"


class Industry(models.Model):
    """Categorises organizations; docs/04_Database_Design.md:296-314."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "industries"
        ordering = ["id"]

    def __str__(self):
        return self.name


class Organization(models.Model):
    """A registered service provider; docs/04_Database_Design.md:274-292."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    industry = models.ForeignKey(
        Industry,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="organizations",
        db_column="industry_id",
    )
    location = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=32, null=True, blank=True)
    website = models.CharField(max_length=255, null=True, blank=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organizations"
        ordering = ["-created_at", "id"]

    def __str__(self):
        return self.name


class Service(models.Model):
    """A service offered by an organization; docs/04_Database_Design.md:318-333."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="services",
        db_column="organization_id",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        ordering = ["id"]

    def __str__(self):
        return self.name
