from rest_framework import serializers

from .models import Industry, Organization


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ("id", "name", "description")


class OrganizationListSerializer(serializers.ModelSerializer):
    industry_name = serializers.CharField(source="industry.name", read_only=True)

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "industry_id",
            "industry_name",
            "location",
            "verification_status",
            "created_at",
        )


class OrganizationDetailSerializer(serializers.ModelSerializer):
    industry = IndustrySerializer(read_only=True)
    owner_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "industry",
            "owner_id",
            "location",
            "phone",
            "website",
            "verification_status",
            "created_at",
            "updated_at",
        )


class OrganizationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    industry_id = serializers.UUIDField()
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    website = serializers.URLField(required=False, allow_blank=True, default="")

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
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("This field may not be blank.")
        return name

    def validate_industry_id(self, value):
        if not Industry.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Industry does not exist.")
        return value