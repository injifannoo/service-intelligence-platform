"""Write-side operations for the reviews slice."""

from django.db import transaction

from features.users.models import User

from .models import RATING_DIMENSIONS, Review, ReviewReport


def _fill_ratings(overall: int, partial=None) -> dict:
    """One score per dimension; omitted dimensions default to the overall rating."""
    partial = partial or {}
    return {dimension: partial.get(dimension, overall) for dimension in RATING_DIMENSIONS}


@transaction.atomic
def create_review(
    *,
    organization,
    user: User,
    rating: int,
    comment=None,
    ratings=None,
) -> Review:
    scores = _fill_ratings(rating, ratings)
    return Review.objects.create(
        organization=organization,
        user=user,
        rating=rating,
        comment=comment,
        **scores,
    )


@transaction.atomic
def update_review(review: Review, *, changes: dict) -> Review:
    """Partial update: only the keys the caller supplied are written.

    Moving `rating` moves the `overall_experience` dimension with it, so the
    documented integer and the overall dimension stay in agreement. A `comment`
    of ``None`` is an explicit clear; an absent key leaves it untouched.
    """
    fields = []

    if "rating" in changes:
        review.rating = changes["rating"]
        review.overall_experience = changes["rating"]
        fields += ["rating", "overall_experience"]

    if "comment" in changes:
        review.comment = changes["comment"]
        fields.append("comment")

    for dimension, value in changes.get("ratings", {}).items():
        if dimension in RATING_DIMENSIONS and value is not None:
            setattr(review, dimension, value)
            fields.append(dimension)

    if fields:
        review.save(update_fields=list(dict.fromkeys(fields)))
    return review


@transaction.atomic
def delete_review(review: Review) -> None:
    """The attached report goes with it, so no orphan is left in the queue."""
    review.delete()


@transaction.atomic
def report_review(*, review: Review, user: User, reason: str, note=None) -> ReviewReport:
    return ReviewReport.objects.create(
        review=review,
        reporter=user,
        reason=reason,
        note=note,
    )
