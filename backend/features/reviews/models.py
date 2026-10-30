import uuid

from django.conf import settings
from django.db import models

RATING_DIMENSIONS = (
    "quality",
    "price",
    "customer_service",
    "speed",
    "overall_experience",
)


class Review(models.Model):
    """A customer review of an organization; docs/04_Database_Design.md:337-353.

    docs/04 names the five rating dimensions (Quality, Price, Customer Service,
    Speed, Overall Experience) without giving them columns, so each score rides
    on the review row. `rating` stays the documented overall integer and always
    mirrors `overall_experience`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        db_column="user_id",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="reviews",
        db_column="organization_id",
    )
    rating = models.PositiveSmallIntegerField()
    quality = models.PositiveSmallIntegerField()
    price = models.PositiveSmallIntegerField()
    customer_service = models.PositiveSmallIntegerField()
    speed = models.PositiveSmallIntegerField()
    overall_experience = models.PositiveSmallIntegerField()
    comment = models.TextField(null=True, blank=True)
    # docs/04:352 leaves `verified` undefined; customers have not been vetted, so
    # a self-submitted review is unverified.
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.organization_id} reviewed by {self.user_id}"

    @property
    def ratings(self):
        return {dimension: getattr(self, dimension) for dimension in RATING_DIMENSIONS}


class ReviewReport(models.Model):
    """An abuse report filed against a review (docs/05:436-441).

    Keyed by `review_id` rather than its own id: the report endpoint answers 409
    when a review is already on file, so a review carries at most one report.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="report",
        db_column="review_id",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_reviews",
        db_column="reporter_id",
    )
    reason = models.CharField(max_length=255)
    note = models.TextField(null=True, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "review_reports"
        ordering = ["-reported_at", "-id"]

    def __str__(self):
        return f"Report on review {self.review_id}"
