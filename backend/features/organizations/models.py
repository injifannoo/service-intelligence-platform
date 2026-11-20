from django.conf import settings
from django.db import models
from django.utils.text import slugify
from pgvector.django import HnswIndex, VectorField

from core.base_models import BaseModel

IS_POSTGRES = "postgresql" in settings.DATABASES["default"]["ENGINE"]


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "UNVERIFIED", "Unverified"
    PENDING = "PENDING", "Pending"
    VERIFIED = "VERIFIED", "Verified"
    REJECTED = "REJECTED", "Rejected"


class SubscriptionTier(models.TextChoices):
    FREE = "FREE", "Free"
    BASIC = "BASIC", "Basic"
    PRO = "PRO", "Pro"
    ENTERPRISE = "ENTERPRISE", "Enterprise"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PAST_DUE = "PAST_DUE", "Past Due"
    CANCELLED = "CANCELLED", "Cancelled"
    TRIALING = "TRIALING", "Trialing"


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
    """Registered service providers (docs/04_Database_Design.md:272-288 & platform-contracts.ts)."""

    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    tagline = models.CharField(max_length=255, blank=True, default="")
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
    location = models.CharField(max_length=255, blank=True, default="", db_index=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    website = models.URLField(max_length=255, blank=True, default="")
    business_hours = models.CharField(max_length=255, blank=True, default="")
    founded = models.PositiveSmallIntegerField(null=True, blank=True)
    size = models.CharField(max_length=50, blank=True, default="10-50")
    price_tier = models.PositiveSmallIntegerField(default=2)
    response_hours = models.PositiveSmallIntegerField(default=24)
    certifications = models.JSONField(default=list, blank=True)
    industries_served = models.JSONField(default=list, blank=True)
    logo_url = models.URLField(max_length=500, blank=True, default="")

    # Trust & Verification (platform-contracts.ts: TrustVerificationBadge)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
        db_index=True,
    )
    is_phone_verified = models.BooleanField(default=False)
    is_fayda_verified = models.BooleanField(default=False)
    has_proof_of_purchase = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    trust_score = models.PositiveSmallIntegerField(default=25)

    # SaaS Subscription & Billing (platform-contracts.ts: OrganizationSubscription)
    plan_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
        db_index=True,
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    current_period_end = models.DateTimeField(null=True, blank=True)

    # Semantic Search Vector (Gemini models/text-embedding-004 -> 768 dimensions)
    embedding = VectorField(dimensions=768, null=True, blank=True)

    class Meta:
        db_table = "organizations"
        ordering = ["name"]
        indexes = (
            [
                HnswIndex(
                    name="org_embedding_hnsw_idx",
                    fields=["embedding"],
                    m=16,
                    ef_construction=64,
                    opclasses=["vector_cosine_ops"],
                ),
            ]
            if IS_POSTGRES
            else []
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or str(self.id)[:8]
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name