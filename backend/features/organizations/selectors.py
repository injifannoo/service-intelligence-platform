from uuid import UUID

from django.db.models import Avg, Count, Q, QuerySet

from .models import Organization


def _annotated_org_queryset() -> QuerySet[Organization]:
    return Organization.objects.select_related("industry", "owner", "ai_insight").annotate(
        average_rating=Avg("reviews__rating"),
        total_reviews=Count("reviews", distinct=True),
    )


def get_organizations(
    *,
    industry_id: UUID | str | None = None,
    location: str | None = None,
    verification_status: str | None = None,
    search_query: str | None = None,
) -> QuerySet[Organization]:
    """Retrieves organizations with optional filtering and aggregated rating metrics."""
    queryset = _annotated_org_queryset()

    if industry_id:
        queryset = queryset.filter(industry_id=industry_id)

    if location:
        queryset = queryset.filter(location__icontains=location.strip())

    if verification_status:
        queryset = queryset.filter(verification_status=verification_status)

    if search_query:
        q = search_query.strip()
        queryset = queryset.filter(
            Q(name__icontains=q)
            | Q(tagline__icontains=q)
            | Q(description__icontains=q)
        )

    return queryset.order_by("-created_at")


def get_organization_by_id(organization_id: UUID | str) -> Organization | None:
    """Fetches a single organization by its UUID with preloaded relations and rating metrics."""
    return _annotated_org_queryset().filter(pk=organization_id).first()


def get_organization_by_slug(slug: str) -> Organization | None:
    """Fetches a single organization by its URL slug with preloaded relations and rating metrics."""
    return _annotated_org_queryset().filter(slug=slug).first()