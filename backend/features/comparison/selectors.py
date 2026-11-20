"""Comparison query selectors with cached AI insights, multi-criteria ratings, and AI recommendations."""

from __future__ import annotations

import logging
from typing import Any, Optional

from django.db.models import Avg, Count

from core.ai_client import AIEngineClient, AIEngineClientError
from features.organizations.models import Organization, VerificationStatus
from features.reviews.models import Review

logger = logging.getLogger(__name__)


def _price_tier_label(price_tier: int) -> str:
    return {1: "Affordable", 2: "Mid-range", 3: "Premium"}.get(price_tier, "Mid-range")


def get_organizations_comparison_data(
    *,
    organization_ids: list,
    query: Optional[str] = None,
    ai_client: Optional[AIEngineClient] = None,
) -> list[dict[str, Any]]:
    """Retrieves side-by-side comparison data with cached AI insights and optional AI recommendation ranking."""
    organizations = (
        Organization.objects.select_related("industry", "owner", "ai_insight")
        .prefetch_related("services")
        .filter(pk__in=organization_ids)
    )

    org_by_id = {str(org.id): org for org in organizations}
    ordered_orgs = [org_by_id[str(oid)] for oid in organization_ids if str(oid) in org_by_id]

    ai_recommendation_map: dict[str, dict[str, Any]] = {}
    if query and query.strip() and len(ordered_orgs) >= 2:
        providers_payload = []
        for org in ordered_orgs:
            avg_rating = float(
                Review.objects.filter(organization=org).aggregate(avg=Avg("rating"))["avg"] or 0.0
            )
            providers_payload.append(
                {
                    "id": str(org.id),
                    "name": org.name,
                    "description": org.description or org.tagline,
                    "location": org.location or None,
                    "services_offered": [s.name for s in org.services.all() if s.status][:10],
                    "rating": round(avg_rating, 2),
                    "price_level": _price_tier_label(org.price_tier),
                }
            )
        try:
            client = ai_client or AIEngineClient()
            rec_data = client.recommend_providers(
                query=query.strip(),
                providers=providers_payload,
            )
            recommended = rec_data.get("recommended_provider")
            if recommended and recommended.get("id"):
                ai_recommendation_map[str(recommended["id"])] = {
                    "is_recommended": True,
                    "match_score": rec_data.get("match_score"),
                    "reasoning": rec_data.get("reasoning", []),
                    "key_decision_factors": rec_data.get("key_decision_factors", []),
                }
        except AIEngineClientError as exc:
            logger.warning("AI Engine unavailable during comparison ranking, continuing with DB metrics: %s", exc)

    comparison_results: list[dict[str, Any]] = []
    for org in ordered_orgs:
        reviews = Review.objects.filter(organization=org)
        review_stats = reviews.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
            avg_technical=Avg("rating_technical"),
            avg_communication=Avg("rating_communication"),
            avg_delivery=Avg("rating_delivery"),
            avg_value=Avg("rating_value"),
        )

        avg_rating = float(review_stats["average_rating"] or 0.0)
        total_reviews = int(review_stats["total_reviews"] or 0)
        avg_price = float(org.services.aggregate(avg_price=Avg("price"))["avg_price"] or 0.0)

        is_verified = org.verification_status == VerificationStatus.VERIFIED
        ai_insight = getattr(org, "ai_insight", None)

        sentiment_index = (
            float(ai_insight.sentiment_positive)
            if ai_insight and ai_insight.reviews_analyzed_count > 0
            else round(avg_rating * 20, 2)
        )

        entry: dict[str, Any] = {
            "organization_id": str(org.id),
            "slug": org.slug,
            "name": org.name,
            "industry": org.industry.name if org.industry else None,
            "location": org.location,
            "verification_status": org.verification_status,
            "is_verified": is_verified,
            "trust_score": org.trust_score,
            "average_rating": round(avg_rating, 2),
            "total_reviews": total_reviews,
            "average_service_price": round(avg_price, 2),
            "ai_sentiment_index": sentiment_index,
            "criteria_ratings": {
                "rating_technical": round(float(review_stats["avg_technical"]), 2)
                if review_stats["avg_technical"] is not None
                else None,
                "rating_communication": round(float(review_stats["avg_communication"]), 2)
                if review_stats["avg_communication"] is not None
                else None,
                "rating_delivery": round(float(review_stats["avg_delivery"]), 2)
                if review_stats["avg_delivery"] is not None
                else None,
                "rating_value": round(float(review_stats["avg_value"]), 2)
                if review_stats["avg_value"] is not None
                else None,
            },
            "ai_summary": ai_insight.summary if ai_insight else "",
            "overall_consensus": ai_insight.overall_consensus if ai_insight else "",
            "strengths": ai_insight.strengths if ai_insight else [],
            "weaknesses": ai_insight.weaknesses if ai_insight else [],
        }

        if str(org.id) in ai_recommendation_map:
            entry["ai_recommendation"] = ai_recommendation_map[str(org.id)]

        comparison_results.append(entry)

    return comparison_results