from rest_framework import serializers
from .models import SearchLog


class AISearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=500, required=True, allow_blank=False)
    industry_id = serializers.UUIDField(required=False, allow_null=True)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_query(self, value):
        query = value.strip()
        if not query:
            raise serializers.ValidationError("Search query cannot be empty.")
        return query


class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchLog
        fields = ("id", "query", "filters_applied", "results_count", "created_at")
        read_only_fields = fields