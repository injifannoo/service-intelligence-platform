"""Celery tasks for asynchronous review sentiment analysis and organization AI insight aggregation."""

from __future__ import annotations

import logging
from typing import Any

from celery import shared_task
from django.db.models import Avg

from core.ai_client import AIEngineError, ServiceIntelAIClient
from features.organizations.models import Organization, VerificationStatus
from .models import AIInsight, Review

logger = logging.getLogger(__name__)


def compute_organization_trust_score(
    *,
    average_rating: float,
    review_count: int,
    verified: bool,
    positive_pct: float,
) -> int:
    """Mirrors frontend/src/lib/metrics.ts `trustScore` (0-100 scale)."""
    if review_count == 0:
        return 40 if verified else 25
    score = (
        (average_rating / 5.0) * 55.0
        + (15.0 if verified else 0.0)
        + (min(review_count, 40) / 40.0) * 15.0
        + (positive_pct / 100.0) * 15.0
    )
    return round(min(100.0, max(0.0, score)))


@shared_task(
    bind=True,
    autoretry_for=(AIEngineError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="reviews.analyze_review_and_refresh_insights",
)
def analyze_review_and_refresh_insights_task(
    self,
    review_id: str,
    organization_id: str,
) -> dict[str, Any]:
    """Runs sentiment extraction on a single review and refreshes the parent organization's AIInsight."""
    client = ServiceIntelAIClient()

    # 1. Analyze individual review sentiment if comment text is present
    review = Review.objects.filter(pk=review_id).first()
    if review and review.comment and len(review.comment.strip()) >= 3:
        sentiment_data = client.analyze_sentiment(
            text=review.comment.strip(),
            provider_id=str(organization_id),
        )
        Review.objects.filter(pk=review.pk).update(
            sentiment_label=sentiment_data.get("sentiment", ""),
            sentiment_score=sentiment_data.get("sentiment_score"),
            positive_aspects=sentiment_data.get("positive_aspects", []),
            negative_aspects=sentiment_data.get("negative_aspects", []),
        )

    # 2. Refresh organization-level AIInsight & trust_score
    return refresh_organization_ai_insights(organization_id=organization_id, client=client)


def refresh_organization_ai_insights(
    *,
    organization_id: str,
    client: ServiceIntelAIClient | None = None,
) -> dict[str, Any]:
    """Aggregates all reviews for an organization into AIInsight and updates Organization.trust_score."""
    organization = Organization.objects.filter(pk=organization_id).first()
    if not organization:
        logger.warning("Organization %s not found for AI insight refresh.", organization_id)
        return {"status": "skipped", "reason": "org_not_found", "organization_id": organization_id}

    reviews_qs = Review.objects.filter(organization=organization).order_by("-created_at")
    total_reviews = reviews_qs.count()

    if total_reviews == 0:
        AIInsight.objects.filter(organization=organization).delete()
        is_verified = organization.verification_status == VerificationStatus.VERIFIED
        Organization.objects.filter(pk=organization.pk).update(
            trust_score=40 if is_verified else 25
        )
        return {"status": "cleared", "organization_id": str(organization.id)}

    avg_rating = float(reviews_qs.aggregate(avg=Avg("rating"))["avg"] or 0.0)

    # Compute sentiment distribution from analyzed reviews (fallback to star rating buckets)
    pos_count = 0
    neu_count = 0
    neg_count = 0
    score_sum = 0.0
    score_count = 0

    review_texts: list[str] = []
    for rev in reviews_qs[:50]:
        if rev.comment and rev.comment.strip():
            review_texts.append(rev.comment.strip())

        label = (rev.sentiment_label or "").lower()
        if label == "positive":
            pos_count += 1
        elif label == "negative":
            neg_count += 1
        elif label in {"neutral", "mixed"}:
            neu_count += 1
        else:
            if rev.rating >= 4:
                pos_count += 1
            elif rev.rating <= 2:
                neg_count += 1
            else:
                neu_count += 1

        if rev.sentiment_score is not None:
            score_sum += float(rev.sentiment_score)
            score_count += 1

    analyzed_total = max(1, pos_count + neu_count + neg_count)
    pos_pct = round((pos_count / analyzed_total) * 100)
    neg_pct = round((neg_count / analyzed_total) * 100)
    neu_pct = max(0, 100 - pos_pct - neg_pct)
    avg_sentiment_score = round(score_sum / score_count, 3) if score_count else round((avg_rating - 3.0) / 2.0, 3)

    summary_payload: dict[str, Any] = {}
    if review_texts:
        ai_client = client or ServiceIntelAIClient()
        summary_payload = ai_client.summarize_reviews(
            provider_name=organization.name,
            reviews=review_texts[:25],
            provider_id=str(organization.id),
        )

    strengths = summary_payload.get("strengths", [])
    weaknesses = summary_payload.get("weaknesses", [])
    main_complaint = weaknesses[0] if weaknesses else ""

    AIInsight.objects.update_or_create(
        organization=organization,
        defaults={
            "summary": summary_payload.get("summary", ""),
            "overall_consensus": summary_payload.get("overall_consensus", ""),
            "sentiment_positive": pos_pct,
            "sentiment_neutral": neu_pct,
            "sentiment_negative": neg_pct,
            "sentiment_score": avg_sentiment_score,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "main_complaint": main_complaint[:255],
            "reviews_analyzed_count": total_reviews,
        },
    )

    is_verified = organization.verification_status == VerificationStatus.VERIFIED
    new_trust_score = compute_organization_trust_score(
        average_rating=avg_rating,
        review_count=total_reviews,
        verified=is_verified,
        positive_pct=float(pos_pct),
    )
    Organization.objects.filter(pk=organization.pk).update(trust_score=new_trust_score)

    return {
        "status": "completed",
        "organization_id": str(organization.id),
        "reviews_analyzed": total_reviews,
        "trust_score": new_trust_score,
    }