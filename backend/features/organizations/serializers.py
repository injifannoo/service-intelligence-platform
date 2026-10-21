import math

from rest_framework import serializers

from .models import Industry, Organization, Service
from .selectors import get_industry_by_name, get_organization_by_id


def _as_number(value):
    """Mirrors the BFF `num()` helper: finite numbers and numeric strings only."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value if math.isfinite(value) else None
    if isinstance(value, str) and value.strip() != "":
        try:
            number = float(value)
        except ValueError:
            return None
        return number if math.isfinite(number) else None
    return None


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ("id", "name", "description")


class ServiceSerializer(serializers.ModelSerializer):
    """Response shape of the services endpoints (docs/05:363-401)."""

    organization_id = serializers.UUIDField(read_only=True)
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, allow_null=True
    )

    class Meta:
        model = Service
        fields = ("id", "organization_id", "name", "description", "price", "status")


class ServiceListSerializer(ServiceSerializer):
    """Flat service rows are decorated with their parent organization."""

    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_rating = serializers.SerializerMethodField()

    class Meta(ServiceSerializer.Meta):
        fields = ServiceSerializer.Meta.fields + (
            "organization_name",
            "organization_rating",
        )

    def get_organization_rating(self, instance):
        return getattr(instance.organization, "rating", None)


class OrganizationSerializer(serializers.ModelSerializer):
    """List/create/update response shape (docs/05_API_Design.md:294-341)."""

    industry_id = serializers.UUIDField(read_only=True, allow_null=True)
    rating = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "description",
            "industry_id",
            "location",
            "phone",
            "website",
            "verification_status",
            "rating",
            "created_at",
        )

    def get_rating(self, instance):
        return getattr(instance, "rating", None)


class OrganizationDetailSerializer(OrganizationSerializer):
    """Detail nests the industry and, once implemented, its catalogue."""

    industry = IndustrySerializer(read_only=True)
    services = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta(OrganizationSerializer.Meta):
        fields = OrganizationSerializer.Meta.fields + ("services", "industry", "review_count")

    def get_services(self, instance):
        return ServiceSerializer(instance.services.all(), many=True).data

    def get_review_count(self, instance):
        from features.reviews.selectors import organization_review_count

        return organization_review_count(instance.pk)


def _clean(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


class OrganizationCreateSerializer(serializers.Serializer):
    """Request of POST `/organizations/`; `industry` is the display name."""

    name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    industry = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, write_only=True
    )
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    website = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        errors = {}

        name = _clean(attrs.get("name"))
        if name is None:
            errors["name"] = ["This field is required."]

        industry_name = _clean(attrs.get("industry"))
        if industry_name is None:
            errors["industry"] = ["This field is required."]

        if self.context["request"].user.organization_id:
            errors["organization"] = [
                "You already manage an organization. "
                "One verified organization is allowed per legal business."
            ]

        industry = None
        if industry_name is not None:
            industry = get_industry_by_name(industry_name)
            if industry is None:
                errors["industry"] = ["Select a valid industry."]

        if errors:
            raise serializers.ValidationError(errors)

        return {
            "name": name,
            "industry": industry,
            "description": _clean(attrs.get("description")),
            "location": _clean(attrs.get("location")),
            "phone": _clean(attrs.get("phone")),
            "website": _clean(attrs.get("website")),
        }


class OrganizationUpdateSerializer(serializers.Serializer):
    """Request of PUT `/organizations/<id>/`; omitted optional fields clear."""

    name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    website = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        name = _clean(attrs.get("name"))
        if name is None:
            raise serializers.ValidationError({"name": ["This field is required."]})

        return {
            "name": name,
            "description": _clean(attrs.get("description")),
            "location": _clean(attrs.get("location")),
            "phone": _clean(attrs.get("phone")),
            "website": _clean(attrs.get("website")),
        }


class NestedServiceCreateSerializer(serializers.Serializer):
    """Request of POST `/organizations/<id>/services/` (docs/05:358-361)."""

    name = serializers.JSONField(required=False, allow_null=True)
    description = serializers.JSONField(required=False, allow_null=True)
    price = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        errors = {}

        raw_name = attrs.get("name")
        name = raw_name.strip() if isinstance(raw_name, str) else ""
        if not name:
            errors["name"] = ["This field is required."]

        price = _as_number(attrs.get("price"))
        if price is not None and price < 0:
            errors["price"] = ["Must be a positive number."]

        if errors:
            raise serializers.ValidationError(errors)

        raw_description = attrs.get("description")
        description = raw_description.strip() if isinstance(raw_description, str) else None
        return {"name": name, "description": description, "price": price}


class ServiceCreateSerializer(serializers.Serializer):
    """Request of POST `/services/` (docs/05:365-381)."""

    name = serializers.JSONField(required=False, allow_null=True)
    organization_id = serializers.JSONField(required=False, allow_null=True)
    description = serializers.JSONField(required=False, allow_null=True)
    price = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        raw_name = attrs.get("name")
        name = raw_name.strip() if isinstance(raw_name, str) else ""
        if not name:
            raise serializers.ValidationError({"name": ["This field is required."]})

        raw_organization_id = attrs.get("organization_id")
        organization_id = raw_organization_id if isinstance(raw_organization_id, str) else ""
        organization = get_organization_by_id(organization_id)
        if organization is None:
            raise serializers.ValidationError(
                {"organization_id": ["A valid organization_id is required."]}
            )

        raw_description = attrs.get("description")
        description = raw_description if isinstance(raw_description, str) else None
        raw_price = attrs.get("price")
        price = (
            raw_price
            if isinstance(raw_price, (int, float)) and not isinstance(raw_price, bool)
            else None
        )

        return {
            "organization": organization,
            "name": name,
            "description": description,
            "price": price,
        }


class ServiceUpdateSerializer(serializers.Serializer):
    """Request of PUT `/services/<id>/`; only provided keys change."""

    name = serializers.JSONField(required=False, allow_null=True)
    description = serializers.JSONField(required=False, allow_null=True)
    price = serializers.JSONField(required=False, allow_null=True)
    status = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        errors = {}
        update = {}

        if "name" in attrs:
            raw_name = attrs["name"]
            if isinstance(raw_name, str):
                if raw_name.strip() == "":
                    errors["name"] = ["Service name cannot be empty."]
                else:
                    update["name"] = raw_name

        if "description" in attrs:
            raw_description = attrs["description"]
            if raw_description is None:
                update["description"] = None
            elif isinstance(raw_description, str):
                update["description"] = raw_description

        if "price" in attrs:
            raw_price = attrs["price"]
            if raw_price is None:
                update["price"] = None
            else:
                price = _as_number(raw_price)
                if price is None:
                    errors["price"] = ["Enter a number."]
                elif price < 0:
                    errors["price"] = ["Price cannot be negative."]
                else:
                    update["price"] = price

        if isinstance(attrs.get("status"), bool):
            update["status"] = attrs["status"]

        if errors:
            raise serializers.ValidationError(errors)

        return update
