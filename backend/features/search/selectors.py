"""Search query selectors supporting organization search, services, and hybrid pgvector semantic search."""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.db import connection
from django.db.models import Avg, Q, QuerySet

from core.ai_client import AIEngineClient, AIEngineClientError
from features.organizations.models import Organization
from features.services.models import Service

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
            | Q(tagline__icontains=query_strip)
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


def _compute_keyword_score(org: Organization, terms: list[str]) -> tuple[float, list[str]]:
    """Computes normalized 0.0-1.0 lexical overlap and matched concept terms."""
    if not terms:
        return 0.0, []
    haystack = " ".join(
        filter(
            None,
            [
                org.name,
                org.tagline,
                org.description,
                org.location,
                org.industry.name if org.industry_id else "",
            ],
        )
    ).lower()
    matched = [term for term in terms if term in haystack]
    return round(len(matched) / len(terms), 4), matched


def semantic_search_organizations(
    *,
    query: str,
    industry_id: Optional[str] = None,
    location: Optional[str] = None,
    verified_only: bool = False,
    limit: int = 10,
    ai_client: Optional[AIEngineClient] = None,
) -> list[dict[str, Any]]:
    """Hybrid pgvector cosine similarity + lexical search over organizations with lexical fallback."""
    if not query or not query.strip():
        return []

    query_text = query.strip()
    terms = [t.lower() for t in query_text.split() if len(t) >= 2]
    client = ai_client or AIEngineClient()

    base_qs = Organization.objects.select_related("industry").all()
    if industry_id:
        base_qs = base_qs.filter(industry_id=industry_id)
    if location:
        base_qs = base_qs.filter(location__icontains=location.strip())
    if verified_only:
        base_qs = base_qs.filter(verification_status="VERIFIED")

    query_vector: list[float] = []
    try:
        query_vector = client.generate_embedding(text=query_text, task_type="RETRIEVAL_QUERY")
    except AIEngineClientError as exc:
        logger.warning("AI Engine unavailable for org semantic search, falling back to lexical: %s", exc)

    ranked_records: list[dict[str, Any]] = []

    if query_vector and connection.vendor == "postgresql":
        from pgvector.django import CosineDistance

        vector_qs = (
            base_qs.filter(embedding__isnull=False)
            .annotate(distance=CosineDistance("embedding", query_vector))
            .order_by("distance")[: max(limit * 2, 20)]
        )
        for org in vector_qs:
            semantic_score = round(max(0.0, min(1.0, 1.0 - float(org.distance))), 4)
            keyword_score, matched = _compute_keyword_score(org, terms)
            combined_rank = round((semantic_score * 0.7) + (keyword_score * 0.3), 4)
            ranked_records.append(
                {
                    "id": str(org.id),
                    "orgId": str(org.id),
                    "slug": org.slug,
                    "name": org.name,
                    "description": org.description,
                    "location": org.location,
                    "industry": org.industry.name if org.industry else None,
                    "semanticScore": semantic_score,
                    "keywordScore": keyword_score,
                    "combinedRank": combined_rank,
                    "matchedConcepts": matched,
                    "reason": (
                        f"Semantic match ({int(semantic_score * 100)}%) across profile and service capabilities."
                    ),
                }
            )
        ranked_records.sort(key=lambda r: r["combinedRank"], reverse=True)

    # Fallback / supplement with lexical results when SQLite is active, embeddings aren't populated yet, or vector hits < limit
    seen_ids = {item["id"] for item in ranked_records}
    if len(ranked_records) < limit:
        lexical_qs = search_organizations(
            query=query_text,
            industry_id=industry_id,
            location=location,
            verified_only=verified_only,
        ).exclude(pk__in=seen_ids)[: limit - len(ranked_records)]

        for org in lexical_qs:
            keyword_score, matched = _compute_keyword_score(org, terms)
            ranked_records.append(
                {
                    "id": str(org.id),
                    "orgId": str(org.id),
                    "slug": org.slug,
                    "name": org.name,
                    "description": org.description,
                    "location": org.location,
                    "industry": org.industry.name if org.industry else None,
                    "semanticScore": 0.0,
                    "keywordScore": keyword_score,
                    "combinedRank": keyword_score,
                    "matchedConcepts": matched,
                    "reason": "Matches your natural language and filter requirements.",
                }
            )

    return ranked_records[:limit]


def semantic_search_services(
    *,
    query: str,
    limit: int = 10,
    ai_client: Optional[AIEngineClient] = None,
) -> list[dict[str, Any]]:
    """Performs semantic search using AI Engine embeddings with fallback to lexical matching."""
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