"""Search and vector query selectors (docs/05_API_Design.md & docs/10_AI_Roadmap.md)."""

from django.db import models
from django.db.models import QuerySet
from features.organizations.models import Organization


def search_organizations(*, query: str | None = None, industry_id=None, location: str | None = None) -> QuerySet[Organization]:
    """Performs standard keyword and multi-attribute filtering across organization records."""
    queryset = Organization.objects.select_related("industry").all()

    if industry_id:
        queryset = queryset.filter(industry_id=industry_id)

    if location:
        queryset = queryset.filter(location__icontains=location.strip())

    if query:
        clean_query = query.strip()
        queryset = queryset.filter(
            models.Q(name__icontains=clean_query) |
            models.Q(description__icontains=clean_query) |
            models.Q(industry__name__icontains=clean_query)
        )

    return queryset


def get_organization_by_id(organization_id) -> Organization | None:
    return Organization.objects.select_related("industry").filter(pk=organization_id).first()