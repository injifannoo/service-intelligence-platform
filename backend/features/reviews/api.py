"""Review API endpoints."""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.views import PublicReadMixin
from features.organizations.models import Organization

from .selectors import get_organization_reviews
from .serializers import ReviewCreateUpdateSerializer, ReviewSerializer
from .services import create_or_update_review


class OrganizationReviewListCreateView(PublicReadMixin, APIView):
    """GET/POST `/api/v1/organizations/{id}/reviews/`."""

    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, organization_id):
        if not Organization.objects.filter(pk=organization_id).exists():
            raise NotFound("Organization not found.")
            
        queryset = get_organization_reviews(organization_id=organization_id)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ReviewSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, organization_id):
        organization = Organization.objects.filter(pk=organization_id).first()
        if not organization:
            raise NotFound("Organization not found.")

        serializer = ReviewCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        review = create_or_update_review(
            organization=organization,
            user=request.user,
            rating=data["rating"],
            comment=data.get("comment", ""),
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)