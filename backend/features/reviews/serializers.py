"""Review payload serializers."""

from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True, default=None)

    class Meta:
        model = Review
        fields = (
            "id",
            "organization_id",
            "user_id",
            "user_name",
            "user_email",
            "service_id",
            "service_name",
            "rating",
            "rating_technical",
            "rating_communication",
            "rating_delivery",
            "rating_value",
            "title",
            "comment",
            "verified",
            "verification_tier",
            "provider_response",
            "provider_responded_at",
            "sentiment_label",
            "sentiment_score",
            "positive_aspects",
            "negative_aspects",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user_id",
            "verified",
            "verification_tier",
            "provider_response",
            "provider_responded_at",
            "sentiment_label",
            "sentiment_score",
            "positive_aspects",
            "negative_aspects",
            "created_at",
            "updated_at",
        )


class ReviewCreateUpdateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    service_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    rating_technical = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True, default=None)
    rating_communication = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True, default=None)
    rating_delivery = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True, default=None)
    rating_value = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True, default=None)