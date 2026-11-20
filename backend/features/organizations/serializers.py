from rest_framework import serializers

from features.reviews.models import AIInsight
from .models import Industry, Organization, VerificationStatus


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ("id", "name", "description")


class AIInsightSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = (
            "summary",
            "overall_consensus",
            "sentiment_positive",
            "sentiment_neutral",
            "sentiment_negative",
            "sentiment_score",
            "strengths",
            "weaknesses",
            "main_complaint",
            "reviews_analyzed_count",
            "updated_at",
        )


def _serialize_subscription(org: Organization) -> dict:
    return {
        "plan_tier": org.plan_tier,
        "status": org.subscription_status,
        "current_period_end": org.current_period_end.isoformat() if org.current_period_end else None,
        "features": {
            "ai_insights": org.plan_tier in {"BASIC", "PRO", "ENTERPRISE"},
            "verified_badge": org.verification_status == VerificationStatus.VERIFIED,
            "priority_ranking": org.plan_tier in {"PRO", "ENTERPRISE"},
            "analytics_export": org.plan_tier in {"PRO", "ENTERPRISE"},
        },
    }


def _serialize_verification(org: Organization) -> dict:
    is_verified = org.verification_status == VerificationStatus.VERIFIED
    return {
        "status": org.verification_status,
        "is_verified": is_verified,
        "is_fayda_verified": org.is_fayda_verified,
        "is_phone_verified": org.is_phone_verified,
        "has_proof_of_purchase": org.has_proof_of_purchase,
        "verified_at": org.verified_at.isoformat() if org.verified_at else None,
    }


class OrganizationListSerializer(serializers.ModelSerializer):
    industry_name = serializers.CharField(source="industry.name", read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()
    verification = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "slug",
            "name",
            "tagline",
            "description",
            "industry_id",
            "industry_name",
            "location",
            "logo_url",
            "price_tier",
            "response_hours",
            "trust_score",
            "average_rating",
            "total_reviews",
            "verification_status",
            "verification",
            "subscription",
            "created_at",
        )

    def get_average_rating(self, obj: Organization) -> float:
        val = getattr(obj, "average_rating", None)
        return round(float(val), 2) if val is not None else 0.0

    def get_total_reviews(self, obj: Organization) -> int:
        val = getattr(obj, "total_reviews", None)
        return int(val) if val is not None else 0

    def get_subscription(self, obj: Organization) -> dict:
        return _serialize_subscription(obj)

    def get_verification(self, obj: Organization) -> dict:
        return _serialize_verification(obj)


class OrganizationDetailSerializer(serializers.ModelSerializer):
    industry = IndustrySerializer(read_only=True)
    owner_id = serializers.UUIDField(read_only=True, allow_null=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()
    verification = serializers.SerializerMethodField()
    ai_insight = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "slug",
            "name",
            "tagline",
            "description",
            "industry",
            "owner_id",
            "location",
            "phone",
            "email",
            "website",
            "business_hours",
            "logo_url",
            "founded",
            "size",
            "price_tier",
            "response_hours",
            "certifications",
            "industries_served",
            "trust_score",
            "average_rating",
            "total_reviews",
            "verification_status",
            "verification",
            "subscription",
            "ai_insight",
            "created_at",
            "updated_at",
        )

    def get_average_rating(self, obj: Organization) -> float:
        val = getattr(obj, "average_rating", None)
        if val is not None:
            return round(float(val), 2)
        from django.db.models import Avg
        avg = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(float(avg), 2) if avg is not None else 0.0

    def get_total_reviews(self, obj: Organization) -> int:
        val = getattr(obj, "total_reviews", None)
        if val is not None:
            return int(val)
        return obj.reviews.count()

    def get_subscription(self, obj: Organization) -> dict:
        return _serialize_subscription(obj)

    def get_verification(self, obj: Organization) -> dict:
        return _serialize_verification(obj)

    def get_ai_insight(self, obj: Organization) -> dict | None:
        insight = getattr(obj, "ai_insight", None)
        if not insight:
            return None
        return AIInsightSummarySerializer(insight).data


class OrganizationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    industry_id = serializers.UUIDField()
    tagline = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    website = serializers.URLField(required=False, allow_blank=True, default="")
    business_hours = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    logo_url = serializers.URLField(max_length=500, required=False, allow_blank=True, default="")
    founded = serializers.IntegerField(min_value=1800, max_value=2100, required=False, allow_null=True, default=None)
    size = serializers.CharField(max_length=50, required=False, allow_blank=True, default="10-50")
    price_tier = serializers.IntegerField(min_value=1, max_value=3, required=False, default=2)
    response_hours = serializers.IntegerField(min_value=1, max_value=720, required=False, default=24)
    certifications = serializers.ListField(child=serializers.CharField(max_length=120), required=False, default=list)
    industries_served = serializers.ListField(child=serializers.CharField(max_length=120), required=False, default=list)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_industry_id(self, value):
        if not Industry.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Industry does not exist.")
        return value


class OrganizationUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    industry_id = serializers.UUIDField(required=False)
    tagline = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    business_hours = serializers.CharField(max_length=255, required=False, allow_blank=True)
    logo_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    founded = serializers.IntegerField(min_value=1800, max_value=2100, required=False, allow_null=True)
    size = serializers.CharField(max_length=50, required=False, allow_blank=True)
    price_tier = serializers.IntegerField(min_value=1, max_value=3, required=False)
    response_hours = serializers.IntegerField(min_value=1, max_value=720, required=False)
    certifications = serializers.ListField(child=serializers.CharField(max_length=120), required=False)
    industries_served = serializers.ListField(child=serializers.CharField(max_length=120), required=False)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_industry_id(self, value):
        if not Industry.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Industry does not exist.")
        return value