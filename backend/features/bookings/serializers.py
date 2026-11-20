"""Booking payload serializers."""

from rest_framework import serializers
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True, allow_null=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "organization_id",
            "organization_name",
            "user_id",
            "user_email",
            "service_id",
            "service_name",
            "booking_date",
            "status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user_id", "status", "created_at", "updated_at")


class BookingCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    service_id = serializers.UUIDField(required=False, allow_null=True)
    booking_date = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BookingStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Booking.Status.choices)