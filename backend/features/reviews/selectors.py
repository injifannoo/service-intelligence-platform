"""Review query selectors."""

from django.db.models import QuerySet
from .models import Review


def get_organization_reviews(*, organization_id) -> QuerySet[Review]:
    """Returns reviews for an organization, optimized with user data."""
    return Review.objects.select_related("user").filter(organization_id=organization_id)


def get_review_by_id(review_id) -> Review | None:
    return Review.objects.select_related("user", "organization").filter(pk=review_id).first()