from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.base_models import BaseModel


class ReviewVerificationTier(models.TextChoices):
    UNVERIFIED = "UNVERIFIED", "Unverified"
    PHONE_VERIFIED = "PHONE_VERIFIED", "Phone Verified"
    FAYDA_VERIFIED = "FAYDA_VERIFIED", "Fayda Verified"
    VERIFIED_BUYER = "VERIFIED_BUYER", "Verified Buyer"


class Review(BaseModel):
    """Customer review, multi-criteria sub-ratings, and AI sentiment (docs/04_Database_Design.md & metrics.ts)."""

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.SET_NULL,
        related_name="reviews",
        null=True,
        blank=True,
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    # Industry-specific multi-criteria sub-ratings (frontend/src/lib/metrics.ts: CRITERIA)
    rating_technical = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    rating_communication = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    rating_delivery = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    rating_value = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    title = models.CharField(max_length=255, blank=True, default="")
    comment = models.TextField(blank=True, default="")

    # Trust & Verification provenance (platform-contracts.ts: TrustVerificationBadge)
    verified = models.BooleanField(default=False, db_index=True)
    verification_tier = models.CharField(
        max_length=20,
        choices=ReviewVerificationTier.choices,
        default=ReviewVerificationTier.UNVERIFIED,
    )

    # Provider response
    provider_response = models.TextField(blank=True, default="")
    provider_responded_at = models.DateTimeField(null=True, blank=True)

    # AI Sentiment & Aspect Extraction (ai-engine: SentimentAnalysisResponse)
    sentiment_label = models.CharField(max_length=20, blank=True, default="")
    sentiment_score = models.FloatField(null=True, blank=True)
    positive_aspects = models.JSONField(default=list, blank=True)
    negative_aspects = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "organization_reviews"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="unique_organization_user_review",
            )
        ]

    def __str__(self):
        return f"Review {self.rating}/5 for {self.organization.name} by {self.user.email}"


class AIInsight(BaseModel):
    """Cached AI review summary, sentiment breakdown, and advisor insights per organization (docs/04_Database_Design.md)."""

    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="ai_insight",
    )
    summary = models.TextField(blank=True, default="")
    overall_consensus = models.CharField(max_length=40, blank=True, default="")
    sentiment_positive = models.PositiveSmallIntegerField(default=0)
    sentiment_neutral = models.PositiveSmallIntegerField(default=0)
    sentiment_negative = models.PositiveSmallIntegerField(default=0)
    sentiment_score = models.FloatField(default=0.0)
    strengths = models.JSONField(default=list, blank=True)
    weaknesses = models.JSONField(default=list, blank=True)
    main_complaint = models.CharField(max_length=255, blank=True, default="")
    recommendation = models.TextField(blank=True, default="")
    monthly_briefing = models.JSONField(default=dict, blank=True)
    reviews_analyzed_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "ai_insights"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"AIInsight for {self.organization.name}"