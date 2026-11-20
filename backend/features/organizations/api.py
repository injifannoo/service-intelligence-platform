from uuid import UUID

from django.core.cache import cache
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.views import PublicReadMixin

from .permissions import IsOrganizationOwnerOrAdmin
from .selectors import (
    get_organization_by_id,
    get_organization_by_slug,
    get_organizations,
)
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


def _resolve_organization(identifier: str):
    try:
        UUID(str(identifier))
        return get_organization_by_id(identifier)
    except (ValueError, TypeError):
        return get_organization_by_slug(str(identifier))


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
    """GET/PUT `/api/v1/organizations/{id_or_slug}/` (docs/05_API_Design.md:116-136)."""

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAuthenticated(), IsOrganizationOwnerOrAdmin()]
        return [AllowAny()]

    def _get_object(self, organization_id):
        organization = _resolve_organization(str(organization_id))
        if not organization:
            raise NotFound("Organization not found.")
        self.check_object_permissions(self.request, organization)
        return organization

    def get(self, request, organization_id):
        key_id = str(organization_id)
        cache_key = f"org:detail:{key_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        organization = self._get_object(organization_id)
        payload = OrganizationDetailSerializer(organization).data
        cache.set(f"org:detail:{organization.id}", payload, timeout=300)
        if organization.slug:
            cache.set(f"org:detail:{organization.slug}", payload, timeout=300)
        return Response(payload)

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
        organization = _resolve_organization(str(organization_id))
        if not organization:
            raise NotFound("Organization not found.")
        self.check_object_permissions(request, organization)

        claimed = submit_verification_claim(organization)
        return Response(OrganizationDetailSerializer(claimed).data)