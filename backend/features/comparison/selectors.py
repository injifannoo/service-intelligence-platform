"""Comparison query selectors."""

from django.db.models import Avg, Count
from features.organizations.models import Organization
from features.reviews.models import Review


def get_organizations_comparison_data(*, organization_ids: list) -> list[dict]:
    """Retrieves side-by-side comparison data for a list of organization IDs."""
    organizations = Organization.objects.select_related("industry", "owner").filter(pk__in=organization_ids)

    comparison_results = []
    for org in organizations:
        reviews = Review.objects.filter(organization=org)
        review_stats = reviews.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id")
        )

        avg_rating = review_stats["average_rating"] or 0.0
        total_reviews = review_stats["total_reviews"] or 0

        avg_price = org.services.aggregate(avg_price=Avg("price"))["avg_price"] or 0.0

        is_verified = (
            org.verification_status == Organization.VerificationStatus.VERIFIED
            if hasattr(Organization, "VerificationStatus")
            else org.verification_status == "VERIFIED"
        )

        comparison_results.append({
            "organization_id": str(org.id),
            "name": org.name,
            "industry": org.industry.name if org.industry else None,
            "location": org.location,
            "verification_status": org.verification_status,
            "is_verified": is_verified,
            "average_rating": round(float(avg_rating), 2),
            "total_reviews": total_reviews,
            "average_service_price": round(float(avg_price), 2),
            "ai_sentiment_index": round(float(avg_rating * 20), 2),
        })

    return comparison_results