from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.permissions import IsPlatformAdmin
from core.views import PublicReadMixin
from features.organizations.models import Organization
from features.organizations.permissions import is_organization_manager

from .permissions import IsServiceManager
from .selectors import get_categories, get_service_by_id, get_services
from .serializers import (
    CategorySerializer,
    ServiceCreateSerializer,
    ServiceDetailSerializer,
    ServiceListSerializer,
    ServiceUpdateSerializer,
)
from .services import create_service, delete_service, update_service


def _get_organization_or_404(organization_id) -> Organization:
    organization = Organization.objects.filter(pk=organization_id).first()
    if not organization:
        raise NotFound("Organization not found.")
    return organization


class CategoryListCreateView(PublicReadMixin, APIView):
    """GET/POST `/api/v1/categories/` (Sprint 4 Categories).

    Reading is public because the service form and catalogue filters need the
    vocabulary before a user signs in. Creating a category changes the platform
    taxonomy, so it stays with platform admins.
    """

    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsPlatformAdmin()]
        return [AllowAny()]

    def get(self, request):
        queryset = get_categories(search_query=request.query_params.get("search"))
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = CategorySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


class ServiceListCreateView(PublicReadMixin, APIView):
    """GET/POST `/api/v1/services/` (docs/05_API_Design.md:365-391)."""

    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        queryset = get_services(
            organization_id=request.query_params.get("organization_id"),
            category_id=request.query_params.get("category_id"),
            status=request.query_params.get("status"),
            search_query=request.query_params.get("search"),
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ServiceListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = ServiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        organization = _get_organization_or_404(data["organization_id"])
        if not is_organization_manager(request.user, organization):
            raise PermissionDenied("You do not manage this organization.")

        service = create_service(
            organization=organization,
            name=data["name"],
            description=data.get("description", ""),
            price=data.get("price"),
            category_id=data.get("category_id"),
            status=data.get("status", True),
        )
        return Response(
            ServiceDetailSerializer(service).data,
            status=status.HTTP_201_CREATED,
        )


class ServiceDetailView(PublicReadMixin, APIView):
    """GET/PUT/DELETE `/api/v1/services/{id}/` (docs/05_API_Design.md:394-401)."""

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuthenticated(), IsServiceManager()]
        return [AllowAny()]

    def _get_object(self, service_id):
        service = get_service_by_id(service_id)
        if not service:
            raise NotFound("Service not found.")
        self.check_object_permissions(self.request, service)
        return service

    def get(self, request, service_id):
        service = get_service_by_id(service_id)
        if not service:
            raise NotFound("Service not found.")
        return Response(ServiceDetailSerializer(service).data)

    def put(self, request, service_id):
        service = self._get_object(service_id)
        serializer = ServiceUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        updated = update_service(
            service,
            name=data.get("name"),
            description=data.get("description"),
            price=data.get("price"),
            category_id=data.get("category_id"),
            clear_category="category_id" in data and data["category_id"] is None,
            status=data.get("status"),
        )
        return Response(ServiceDetailSerializer(updated).data)

    def patch(self, request, service_id):
        return self.put(request, service_id)

    def delete(self, request, service_id):
        service = self._get_object(service_id)
        delete_service(service)
        return Response({"message": "Service deleted"})


class OrganizationServiceListCreateView(PublicReadMixin, APIView):
    """GET/POST `/api/v1/organizations/{id}/services/` (docs/05:358-361)."""

    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, organization_id):
        organization = _get_organization_or_404(organization_id)
        queryset = get_services(organization_id=organization.id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ServiceListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, organization_id):
        organization = _get_organization_or_404(organization_id)
        if not is_organization_manager(request.user, organization):
            raise PermissionDenied("You do not manage this organization.")

        # The nested route is authoritative. Copying the organization id in
        # prevents a body field from redirecting the write to another tenant.
        payload = {**request.data, "organization_id": organization.id}
        serializer = ServiceCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = create_service(
            organization=organization,
            name=data["name"],
            description=data.get("description", ""),
            price=data.get("price"),
            category_id=data.get("category_id"),
            status=data.get("status", True),
        )
        return Response(
            ServiceDetailSerializer(service).data,
            status=status.HTTP_201_CREATED,
        )
