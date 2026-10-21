from rest_framework import status
from rest_framework.exceptions import NotFound, ParseError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import AlreadyReported, InvalidPayload
from core.views import PublicReadMixin
from features.organizations.selectors import get_organization_by_id

from .selectors import get_review_by_id, list_reviews_for_organization
from .serializers import (
    OrganizationReviewSerializer,
    ReviewCreateSerializer,
    ReviewReportSerializer,
    ReviewSerializer,
    ReviewUpdateSerializer,
)
from .services import create_review, delete_review, report_review, update_review


def _get_organization_or_404(pk):
    organization = get_organization_by_id(pk)
    if organization is None:
        raise NotFound("Organization not found.")
    return organization


def _get_review_or_404(pk):
    review = get_review_by_id(pk)
    if review is None:
        raise NotFound("Review not found.")
    return review


def _json_object(request):
    """Review PUT treats a missing object body as `INVALID_PAYLOAD`, not a parse error."""
    try:
        data = request.data
    except ParseError as exc:
        raise InvalidPayload() from exc
    if not isinstance(data, dict):
        raise InvalidPayload()
    return data


class ReviewCreateView(APIView):
    """POST `/reviews/` (docs/05_API_Design.md:406-421)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        review = create_review(
            organization=validated["organization"],
            user=request.user,
            rating=validated["rating"],
            comment=validated["comment"],
            ratings=validated["ratings"],
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewDetailView(APIView):
    """PUT/DELETE `/reviews/<id>/` (docs/05:239-245).

    Editing and deleting belong to the author alone; moderation goes through the
    admin reports queue so the audit trail stays honest.
    """

    permission_classes = [IsAuthenticated]

    def _authorized_review(self, request, pk):
        review = _get_review_or_404(pk)
        if str(review.user_id) != str(request.user.pk):
            raise PermissionDenied("You can only change your own review.")
        return review

    def put(self, request, pk):
        review = self._authorized_review(request, pk)

        serializer = ReviewUpdateSerializer(data=_json_object(request))
        serializer.is_valid(raise_exception=True)
        update = serializer.validated_data
        if not update:
            raise InvalidPayload("Provide `rating`, `ratings`, `comment`, or any combination.")

        review = update_review(review, changes=update)
        return Response(ReviewSerializer(review).data)

    def delete(self, request, pk):
        review = self._authorized_review(request, pk)
        delete_review(review)
        return Response({"message": "Review deleted"})


class ReviewReportView(APIView):
    """POST `/reviews/<id>/report/` (docs/05_API_Design.md:436-441)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = _get_review_or_404(pk)

        serializer = ReviewReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if hasattr(review, "report"):
            raise AlreadyReported()

        report_review(review=review, user=request.user, **serializer.validated_data)
        return Response({"message": "Review reported"}, status=status.HTTP_201_CREATED)


class OrganizationReviewsView(PublicReadMixin, APIView):
    """GET `/organizations/<id>/reviews/` (docs/05_API_Design.md:426-432). Public."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        organization = _get_organization_or_404(pk)
        reviews = list_reviews_for_organization(organization.pk)
        return Response(OrganizationReviewSerializer(reviews, many=True).data)
