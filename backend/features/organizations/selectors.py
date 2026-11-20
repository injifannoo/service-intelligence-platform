from uuid import UUID
from django.db.models import QuerySet

from .models import Organization, VerificationStatus


def get_organizations(
    *,
    industry_id: UUID | str | None = None,
    location: str | None = None,
    verification_status: str | None = None,
    search_query: str | None = None,
) -> QuerySet[Organization]:
    """Retrieves organizations with optional filtering.
    
    Includes select_related on `industry` to eliminate N+1 database queries.
    """
    queryset = Organization.objects.select_related("industry").all()

    if industry_id:
        queryset = queryset.filter(industry_id=industry_id)

    if location:
        queryset = queryset.filter(location__icontains=location.strip())

    if verification_status:
        queryset = queryset.filter(verification_status=verification_status)

    if search_query:
        queryset = queryset.filter(name__icontains=search_query.strip())

    return queryset


def get_organization_by_id(organization_id: UUID | str) -> Organization | None:
    """Fetches a single organization by its UUID."""
    return (
        Organization.objects.select_related("industry", "owner")
        .filter(pk=organization_id)
        .first()
    )