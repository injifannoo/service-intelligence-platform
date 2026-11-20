"""Comparison serializers."""

from rest_framework import serializers


class ComparisonRequestSerializer(serializers.Serializer):
    organization_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=5,
        help_text="List of 1 to 5 organization UUIDs to compare."
    )