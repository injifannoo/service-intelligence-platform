from rest_framework import serializers

from features.organizations.models import Organization

from .models import Category, Service


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description")


class ServiceListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_rating = serializers.SerializerMethodField()
    category_id = serializers.UUIDField(read_only=True, allow_null=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    # The frontend renders a bare number, matching the docs' JSON examples and
    # the dev BFF; DRF would otherwise emit a string for DecimalField.
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        allow_null=True,
        coerce_to_string=False,
    )

    class Meta:
        model = Service
        fields = (
            "id",
            "organization_id",
            "organization_name",
            "organization_rating",
            "category_id",
            "category_name",
            "name",
            "description",
            "price",
            "status",
            "created_at",
            "updated_at",
        )

    def get_organization_rating(self, obj) -> float | None:
        """Aggregate rating is owned by the reviews slice (Sprint 6).

        Returning null keeps the service contract stable until reviews exist;
        the frontend treats null as "not rated" and never derives a value.
        """
        return getattr(obj, "organization_rating", None)


class ServiceDetailSerializer(ServiceListSerializer):
    """Detail adds the parent organization's verification state.

    The service page can show whether the provider is verified without a second
    request, which is the same reason the organization detail nests services.
    """

    organization_verification_status = serializers.CharField(
        source="organization.verification_status",
        read_only=True,
    )

    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + ("organization_verification_status",)


def _validate_price(value):
    if value is not None and value < 0:
        raise serializers.ValidationError("Price cannot be negative.")
    return value


def _validate_name(value):
    name = value.strip()
    if not name:
        raise serializers.ValidationError("This field may not be blank.")
    return name


def _validate_category(category_id):
    if category_id is not None and not Category.objects.filter(pk=category_id).exists():
        raise serializers.ValidationError("Category does not exist.")
    return category_id


class ServiceCreateSerializer(serializers.Serializer):
    """Request of POST `/api/v1/services/`.

    `organization_id` is required because docs/05's example body omits it while
    docs/04 makes it mandatory on the Service table.
    """

    organization_id = serializers.UUIDField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        validators=[_validate_price],
    )
    category_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    status = serializers.BooleanField(required=False, default=True)

    def validate_name(self, value):
        return _validate_name(value)

    def validate_category_id(self, value):
        return _validate_category(value)

    def validate_organization_id(self, value):
        if not Organization.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Organization does not exist.")
        return value


class ServiceUpdateSerializer(serializers.Serializer):
    """Request of PUT `/api/v1/services/{id}/`.

    Every field is optional so a partial update cannot blank values the caller
    did not send. An explicit `category_id: null` clears the category.
    """

    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        validators=[_validate_price],
    )
    category_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.BooleanField(required=False)

    def validate_name(self, value):
        return _validate_name(value)

    def validate_category_id(self, value):
        return _validate_category(value)
