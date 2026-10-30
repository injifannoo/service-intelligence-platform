import math

from rest_framework import serializers

from .models import RATING_DIMENSIONS, Review


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


def read_rating_scores(value, errors):
    """Validates the optional `ratings` breakdown, mirroring `readRatingScores`."""
    if value is None:
        return None

    if not isinstance(value, dict):
        errors["ratings"] = ["Ratings must be an object with one score per dimension."]
        return None

    scores = {}
    for key, raw in value.items():
        if key not in RATING_DIMENSIONS:
            errors[f"ratings.{key}"] = ["Unknown rating dimension."]
            continue

        score = _as_number(raw)
        if score is None or not float(score).is_integer() or score < 1 or score > 5:
            errors[f"ratings.{key}"] = ["Each dimension must be a whole number between 1 and 5."]
            continue

        scores[key] = int(score)

    return scores


class ReviewSerializer(serializers.ModelSerializer):
    """Response shape of the reviews endpoints (docs/05:409-432)."""

    user_id = serializers.UUIDField(read_only=True)
    organization_id = serializers.UUIDField(read_only=True)
    author_name = serializers.CharField(source="user.name", read_only=True)
    ratings = serializers.DictField(read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "user_id",
            "organization_id",
            "rating",
            "ratings",
            "comment",
            "verified",
            "created_at",
            "author_name",
        )


class OrganizationReviewSerializer(ReviewSerializer):
    """One row of `GET /organizations/{id}/reviews/` (docs/05:426-432)."""

    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta(ReviewSerializer.Meta):
        fields = ReviewSerializer.Meta.fields + ("organization_name",)


class ReviewCreateSerializer(serializers.Serializer):
    """Request of `POST /reviews/` (docs/05:409-421)."""

    organization_id = serializers.JSONField(required=False, allow_null=True)
    rating = serializers.JSONField(required=False, allow_null=True)
    comment = serializers.JSONField(required=False, allow_null=True)
    ratings = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        from features.organizations.selectors import get_organization_by_id

        errors = {}

        raw_organization_id = attrs.get("organization_id")
        organization_id = (
            raw_organization_id.strip() if isinstance(raw_organization_id, str) else ""
        )
        if not organization_id:
            errors["organization_id"] = ["This field is required."]
        organization = get_organization_by_id(organization_id) if organization_id else None
        if organization_id and organization is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Organization not found.")

        rating = _as_number(attrs.get("rating"))
        if "rating" not in attrs:
            errors["rating"] = ["This field is required."]
        elif rating is None or not float(rating).is_integer() or rating < 1 or rating > 5:
            errors["rating"] = ["Rating must be a whole number between 1 and 5."]

        ratings = read_rating_scores(attrs.get("ratings"), errors)

        if errors:
            raise serializers.ValidationError(errors)

        raw_comment = attrs.get("comment")
        comment = raw_comment.strip() if isinstance(raw_comment, str) else None
        return {
            "organization": organization,
            "rating": int(rating),
            "comment": comment,
            "ratings": ratings,
        }


class ReviewUpdateSerializer(serializers.Serializer):
    """Request of `PUT /reviews/{id}/`; only provided keys change."""

    rating = serializers.JSONField(required=False, allow_null=True)
    comment = serializers.JSONField(required=False, allow_null=True)
    ratings = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        errors = {}
        update = {}

        if "rating" in attrs:
            rating = _as_number(attrs.get("rating"))
            if rating is None or not float(rating).is_integer() or rating < 1 or rating > 5:
                errors["rating"] = ["Rating must be a whole number between 1 and 5."]
            else:
                update["rating"] = int(rating)

        if "comment" in attrs:
            raw_comment = attrs.get("comment")
            if raw_comment is None:
                update["comment"] = None
            elif isinstance(raw_comment, str):
                update["comment"] = raw_comment.strip()
            else:
                errors["comment"] = ["Enter text, or send null to clear it."]

        ratings = read_rating_scores(attrs.get("ratings"), errors)
        if ratings is not None:
            update["ratings"] = ratings

        if errors:
            raise serializers.ValidationError(errors)

        return update


class ReviewReportSerializer(serializers.Serializer):
    """Request of `POST /reviews/{id}/report/` (docs/05:436-441)."""

    reason = serializers.JSONField(required=False, allow_null=True)
    note = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        raw_reason = attrs.get("reason")
        reason = raw_reason.strip() if isinstance(raw_reason, str) else ""
        if not reason:
            raise serializers.ValidationError({"reason": ["This field is required."]})

        raw_note = attrs.get("note")
        note = raw_note.strip() if isinstance(raw_note, str) else None
        return {"reason": reason, "note": note}
