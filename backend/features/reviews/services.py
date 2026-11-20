"""Review business logic and mutations."""

from __future__ import annotations

import logging
from uuid import UUID

from django.core.cache import cache
from django.db import transaction

from features.bookings.models import Booking
from features.organizations.models import Organization
from features.services.models import Service
from features.users.models import CustomerTier, User
from .models import Review, ReviewVerificationTier
from .tasks import analyze_review_and_refresh_insights_task

logger = logging.getLogger(__name__)


def _resolve_review_verification(
    *,
    user: User,
    organization: Organization,
) -> tuple[bool, str]:
    """Determines trust verification tier from completed bookings and user tier."""
    has_completed_booking = Booking.objects.filter(
        user=user,
        organization=organization,
        status=Booking.Status.COMPLETED,
    ).exists()
    if has_completed_booking:
        return True, ReviewVerificationTier.VERIFIED_BUYER

    if user.customer_tier in {CustomerTier.VERIFIED_CUSTOMER, CustomerTier.PREMIUM_CUSTOMER}:
        return True, ReviewVerificationTier.FAYDA_VERIFIED

    return False, ReviewVerificationTier.UNVERIFIED


def _enqueue_review_analysis(review_id: UUID | str, organization_id: UUID | str) -> None:
    """Dispatches async review sentiment + insight refresh after DB commit."""
    rev_id_str = str(review_id)
    org_id_str = str(organization_id)

    def _dispatch() -> None:
        try:
            analyze_review_and_refresh_insights_task.delay(rev_id_str, org_id_str)
        except Exception as exc:  # noqa: BLE001 - never block primary review write if broker is offline
            logger.warning(
                "Failed to enqueue review analysis for review %s (org %s): %s",
                rev_id_str,
                org_id_str,
                exc,
            )

    transaction.on_commit(_dispatch)


@transaction.atomic
def create_or_update_review(
    *,
    organization: Organization,
    user: User,
    rating: int,
    comment: str = "",
    title: str = "",
    service_id: UUID | str | None = None,
    rating_technical: int | None = None,
    rating_communication: int | None = None,
    rating_delivery: int | None = None,
    rating_value: int | None = None,
) -> Review:
    """Creates or updates a review (enforcing one review per user per organization)."""
    service = None
    if service_id:
        service = Service.objects.filter(pk=service_id, organization=organization).first()

    verified, verification_tier = _resolve_review_verification(
        user=user,
        organization=organization,
    )

    review, _ = Review.objects.update_or_create(
        organization=organization,
        user=user,
        defaults={
            "service": service,
            "rating": rating,
            "rating_technical": rating_technical,
            "rating_communication": rating_communication,
            "rating_delivery": rating_delivery,
            "rating_value": rating_value,
            "title": title.strip(),
            "comment": comment.strip(),
            "verified": verified,
            "verification_tier": verification_tier,
        },
    )

    cache.delete(f"org:detail:{organization.id}")
    if organization.slug:
        cache.delete(f"org:slug:{organization.slug}")

    _enqueue_review_analysis(review.id, organization.id)
    return review


@transaction.atomic
def delete_review(review: Review) -> None:
    organization = review.organization
    review_id = review.id
    review.delete()
    cache.delete(f"org:detail:{organization.id}")
    if organization.slug:
        cache.delete(f"org:slug:{organization.slug}")
    _enqueue_review_analysis(review_id, organization.id)