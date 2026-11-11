from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.views import PublicReadMixin

from .permissions import IsOrganizationOwnerOrAdmin
from .selectors import get_organization_by_id, get_organizations
from .serializers import (
    OrganizationCreateSerializer,
    OrganizationDetailSerializer,
    OrganizationListSerializer,
    OrganizationUpdateSerializer,
)
from .services import (
    create_organization,
    submit_verification_claim,
    update_organization,
)


class OrganizationListCreateView(PublicReadMixin, APIView):
    """GET/POST `/api/v1/organizations/` (docs/05_API_Design.md:79-114)."""

    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        industry_id = request.query_params.get("industry")
        location = request.query_params.get("location")
        verification_status = request.query_params.get("status")
        search_query = request.query_params.get("search")

        queryset = get_organizations(
            industry_id=industry_id,
            location=location,
            verification_status=verification_status,
            search_query=search_query,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = OrganizationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = OrganizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = create_organization(
            owner=request.user,
            **serializer.validated_data,
        )
        return Response(
            OrganizationDetailSerializer(organization).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailView(PublicReadMixin, APIView):
    """GET/PUT `/api/v1/organizations/{id}/` (docs/05_API_Design.md:116-136)."""

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAuthenticated(), IsOrganizationOwnerOrAdmin()]
        return [AllowAny()]

    def _get_object(self, organization_id):
        organization = get_organization_by_id(organization_id)
        if not organization:
            raise NotFound("Organization not found.")
        self.check_object_permissions(self.request, organization)
        return organization

    def get(self, request, organization_id):
        organization = self._get_object(organization_id)
        return Response(OrganizationDetailSerializer(organization).data)

    def put(self, request, organization_id):
        organization = self._get_object(organization_id)
        serializer = OrganizationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = update_organization(organization, **serializer.validated_data)
        return Response(OrganizationDetailSerializer(updated).data)


class OrganizationVerifyClaimView(APIView):
    """POST `/api/v1/organizations/{id}/verify/` (docs/05_API_Design.md:138-147)."""

    permission_classes = [IsAuthenticated, IsOrganizationOwnerOrAdmin]

    def post(self, request, organization_id):
        organization = get_organization_by_id(organization_id)
        if not organization:
            raise NotFound("Organization not found.")
        self.check_object_permissions(request, organization)

        claimed = submit_verification_claim(organization)
        return Response(OrganizationDetailSerializer(claimed).data)