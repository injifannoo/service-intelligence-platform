"""Review business logic and mutations."""

from django.db import transaction
from features.organizations.models import Organization
from features.users.models import User
from .models import Review


@transaction.atomic
def create_or_update_review(
    *,
    organization: Organization,
    user: User,
    rating: int,
    comment: str = "",
) -> Review:
    """Creates or updates a review (enforcing one review per user per organization)."""
    review, _ = Review.objects.update_or_create(
        organization=organization,
        user=user,
        defaults={
            "rating": rating,
            "comment": comment.strip(),
        },
    )
    return review


@transaction.atomic
def delete_review(review: Review) -> None:
    review.delete()