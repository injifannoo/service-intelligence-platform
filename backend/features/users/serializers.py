from rest_framework import serializers

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    """Response of GET/PUT `/users/profile/` (docs/05_API_Design.md:250-268)."""

    status = serializers.BooleanField(source="is_active", read_only=True)
    organization_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ("id", "name", "email", "role", "customer_tier", "status", "created_at", "organization_id")
        read_only_fields = ("id", "role", "created_at", "organization_id")


class RegisterSerializer(serializers.Serializer):
    """Request of POST `/auth/register/` (docs/05_API_Design.md:139-163)."""

    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
        error_messages={"min_length": "Must be at least 8 characters."},
    )

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Request of PUT `/users/profile/` (docs/05_API_Design.md:260-268)."""

    class Meta:
        model = User
        fields = ("name", "email")

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_email(self, value):
        email = value.strip().lower()
        duplicate = User.objects.filter(email__iexact=email)
        if self.instance is not None:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email
