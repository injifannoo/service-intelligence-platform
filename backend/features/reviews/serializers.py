"""Review payload serializers."""

from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "organization_id",
            "user_id",
            "user_name",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user_id", "created_at", "updated_at")


class ReviewCreateUpdateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")