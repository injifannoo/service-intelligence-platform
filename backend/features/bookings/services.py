"""Booking business logic and mutations."""

from django.db import transaction
from features.organizations.models import Organization
from features.services.models import Service
from features.users.models import User
from .models import Booking


@transaction.atomic
def create_booking(
    *,
    organization: Organization,
    user: User,
    service: Service | None = None,
    booking_date,
    notes: str = "",
) -> Booking:
    """Creates a new booking."""
    return Booking.objects.create(
        organization=organization,
        user=user,
        service=service,
        booking_date=booking_date,
        notes=notes.strip(),
        status=Booking.Status.PENDING,
    )


@transaction.atomic
def update_booking_status(*, booking: Booking, status: str) -> Booking:
    """Updates the status of a booking."""
    booking.status = status
    booking.save(update_fields=["status", "updated_at"])
    return booking


@transaction.atomic
def cancel_booking(*, booking: Booking) -> Booking:
    """Cancels a booking."""
    booking.status = Booking.Status.CANCELLED
    booking.save(update_fields=["status", "updated_at"])
    return booking