"""Read-side queries for the organizations slice."""

import uuid

from django.db.models import Avg, Q

from .models import Industry, Organization, Service


def _as_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


def list_industries():
    return Industry.objects.all()


def get_industry_by_name(name) -> Industry | None:
    if not isinstance(name, str):
        return None
    return Industry.objects.filter(name__iexact=name.strip()).first()


def get_organization_by_id(organization_id) -> Organization | None:
    key = _as_uuid(organization_id)
    if key is None:
        return None
    return (
        Organization.objects.select_related("industry")
        .prefetch_related("services")
        .filter(pk=key)
        .first()
    )


def list_organizations(
    *, search=None, industry=None, location=None, min_rating=None, max_price=None
):
    """Mirrors the BFF's filter order and the `rating` aggregate filter."""
    queryset = Organization.objects.select_related("industry")

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(description__icontains=search)
            | Q(services__name__icontains=search)
        )

    if industry:
        match = get_industry_by_name(industry)
        queryset = queryset.filter(industry=match) if match else queryset.none()

    if location:
        queryset = queryset.filter(location__icontains=location)

    if min_rating is not None and min_rating > 0:
        queryset = queryset.annotate(avg_rating=Avg("reviews__rating")).filter(
            avg_rating__gte=min_rating
        )

    if max_price is not None and max_price > 0:
        queryset = queryset.filter(services__price__isnull=False, services__price__lte=max_price)

    # `distinct()` plus an aggregate join drops the model's default ordering;
    # restore it so pagination stays deterministic.
    return queryset.distinct().order_by("-created_at", "id")


def get_service_by_id(service_id) -> Service | None:
    key = _as_uuid(service_id)
    if key is None:
        return None
    return Service.objects.select_related("organization").filter(pk=key).first()


def list_services():
    return Service.objects.select_related("organization").all()


def list_services_for_organization(organization_id):
    key = _as_uuid(organization_id)
    if key is None:
        return Service.objects.none()
    return Service.objects.select_related("organization").filter(organization_id=key)
