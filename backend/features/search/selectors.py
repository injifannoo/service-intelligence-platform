"""Search query selectors supporting organization search, services, and AI-powered semantic search."""

import logging
from typing import Any, List, Optional
from django.db.models import Avg, Q, QuerySet

from features.organizations.models import Organization
from features.services.models import Service
from .ai_client import AIEngineClient, AIEngineClientError

logger = logging.getLogger(__name__)


def search_organizations(
    *,
    query: Optional[str] = None,
    industry_id: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None,
    verified_only: bool = False,
    ordering: Optional[str] = None,
) -> QuerySet[Organization]:
    """Primary search and filtering selector for organizations (Sprint 5 contract)."""
    queryset = Organization.objects.select_related("industry", "owner").annotate(
        avg_rating=Avg("reviews__rating")
    )

    if query:
        query_strip = query.strip()
        queryset = queryset.filter(
            Q(name__icontains=query_strip)
            | Q(description__icontains=query_strip)
            | Q(location__icontains=query_strip)
            | Q(industry__name__icontains=query_strip)
        )

    if industry_id:
        queryset = queryset.filter(industry_id=industry_id)

    if location:
        queryset = queryset.filter(location__icontains=location.strip())

    if verified_only:
        queryset = queryset.filter(verification_status="VERIFIED")

    if min_rating is not None:
        queryset = queryset.filter(avg_rating__gte=min_rating)

    allowed_orderings = {
        "rating": "-avg_rating",
        "-rating": "avg_rating",
        "name": "name",
        "-name": "-name",
        "created_at": "-created_at",
        "-created_at": "created_at",
    }
    order_field = allowed_orderings.get(ordering, "-created_at")
    return queryset.order_by(order_field).distinct()


def search_services(
    *,
    query: Optional[str] = None,
    organization_id: Optional[str] = None,
    category_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
) -> QuerySet[Service]:
    """Standard lexical and filter search for services."""
    queryset = Service.objects.select_related("organization", "category").all()

    if organization_id:
        queryset = queryset.filter(organization_id=organization_id)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    if min_price is not None:
        queryset = queryset.filter(price__gte=min_price)

    if max_price is not None:
        queryset = queryset.filter(price__lte=max_price)

    if query:
        query_strip = query.strip()
        queryset = queryset.filter(
            Q(name__icontains=query_strip)
            | Q(description__icontains=query_strip)
            | Q(organization__name__icontains=query_strip)
        )

    return queryset.distinct()


def semantic_search_services(
    *,
    query: str,
    limit: int = 10,
    ai_client: Optional[AIEngineClient] = None,
) -> List[dict[str, Any]]:
    """Performs semantic search using AI Engine embeddings with fallback to lexical matching.

    Args:
        query: User search string.
        limit: Max results count.
        ai_client: Optional injected client for testing.

    Returns:
        List of serialized service dictionaries with relevance metadata.
    """
    if not query or not query.strip():
        return []

    client = ai_client or AIEngineClient()
    query_text = query.strip()

    embeddings = []
    try:
        embeddings = client.generate_embeddings([query_text])
    except AIEngineClientError as exc:
        logger.warning("AI Engine unavailable for semantic search, falling back to lexical: %s", exc)

    services_qs = Service.objects.select_related("organization", "category").filter(
        Q(name__icontains=query_text)
        | Q(description__icontains=query_text)
        | Q(organization__name__icontains=query_text)
    )[:limit]

    results = []
    for service in services_qs:
        results.append(
            {
                "id": str(service.id),
                "name": service.name,
                "description": service.description,
                "price": float(service.price) if service.price is not None else None,
                "organization_name": service.organization.name if service.organization else None,
                "category_name": service.category.name if service.category else None,
                "is_semantic_match": bool(embeddings),
            }
        )

    return results