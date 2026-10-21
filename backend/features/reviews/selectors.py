"""Read-side queries for the reviews slice."""

import uuid

from django.db.models import Avg, Count

from .models import Review


def _as_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


def list_reviews_for_organization(organization_id):
    key = _as_uuid(organization_id)
    if key is None:
        return Review.objects.none()
    return Review.objects.select_related("user").filter(organization_id=key)


def get_review_by_id(review_id) -> Review | None:
    key = _as_uuid(review_id)
    if key is None:
        return None
    return Review.objects.select_related("user", "organization").filter(pk=key).first()


def organization_ratings() -> dict[str, float]:
    """Maps organization id -> rounded average rating, for list decoration."""
    rows = Review.objects.values("organization_id").annotate(average=Avg("rating"))
    return {
        str(row["organization_id"]): round(row["average"], 1)
        for row in rows
        if row["average"] is not None
    }


def organization_review_counts() -> dict[str, int]:
    rows = Review.objects.values("organization_id").annotate(total=Count("id"))
    return {str(row["organization_id"]): row["total"] for row in rows}


def organization_rating(organization_id) -> float | None:
    key = _as_uuid(organization_id)
    if key is None:
        return None
    average = Review.objects.filter(organization_id=key).aggregate(average=Avg("rating"))["average"]
    return round(average, 1) if average is not None else None


def organization_review_count(organization_id) -> int:
    key = _as_uuid(organization_id)
    if key is None:
        return 0
    return Review.objects.filter(organization_id=key).count()
