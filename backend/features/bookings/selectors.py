"""Booking query selectors."""

from django.db.models import QuerySet
from .models import Booking


def get_user_bookings(*, user) -> QuerySet[Booking]:
    """Returns bookings made by a specific user."""
    return Booking.objects.select_related("organization", "service", "user").filter(user=user)


def get_organization_bookings(*, organization_id) -> QuerySet[Booking]:
    """Returns bookings for a specific organization (owner view)."""
    return Booking.objects.select_related("organization", "service", "user").filter(organization_id=organization_id)


def get_booking_by_id(booking_id) -> Booking | None:
    return Booking.objects.select_related("organization", "service", "user").filter(pk=booking_id).first()