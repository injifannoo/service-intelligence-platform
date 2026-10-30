from rest_framework import status
from rest_framework.exceptions import NotFound, ParseError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import InvalidPayload
from core.pagination import StandardResultsSetPagination
from core.permissions import ADMIN_ROLES, IsOrganizationOwnerOrAdmin
from core.views import PublicReadMixin
from features.reviews.selectors import organization_rating, organization_ratings

from .selectors import (
    get_organization_by_id,
    get_service_by_id,
    list_industries,
    list_organizations,
    list_services,
    list_services_for_organization,
)
from .serializers import (
    IndustrySerializer,
    NestedServiceCreateSerializer,
    OrganizationCreateSerializer,
    OrganizationDetailSerializer,
    OrganizationSerializer,
    OrganizationUpdateSerializer,
    ServiceCreateSerializer,
    ServiceListSerializer,
    ServiceSerializer,
    ServiceUpdateSerializer,
)
from .services import (
    create_organization,
    create_service,
    delete_service,
    update_organization,
    update_service,
)


def _number(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _get_organization_or_404(pk):
    organization = get_organization_by_id(pk)
    if organization is None:
        raise NotFound("Organization not found.")
    return organization


def _get_service_or_404(pk):
    service = get_service_by_id(pk)
    if service is None:
        raise NotFound("Service not found.")
    return service


def _ensure_manager(user, organization):
    """Tenant isolation: an owner may only write to the organization they manage."""
    if user.role in ADMIN_ROLES:
        return
    if user.organization_id is None or str(user.organization_id) != str(organization.pk):
        raise PermissionDenied("You do not manage this organization.")


def _json_object(request):
    """Service PUT treats a missing object body as `INVALID_PAYLOAD`, not a parse error."""
    try:
        data = request.data
    except ParseError as exc:
        raise InvalidPayload() from exc
    if not isinstance(data, dict):
        raise InvalidPayload()
    return data


class IndustryListView(PublicReadMixin, APIView):
    """GET `/industries/`; the create form needs the valid taxonomy."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(IndustrySerializer(list_industries(), many=True).data)


class OrganizationListCreateView(PublicReadMixin, APIView):
    """GET/POST `/organizations/` (docs/05_API_Design.md:274-312)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = request.query_params
        queryset = list_organizations(
            search=params.get("search", "").strip() or None,
            industry=params.get("industry", "").strip() or None,
            location=params.get("location", "").strip() or None,
            min_rating=_number(params.get("rating")),
            max_price=_number(params.get("price")),
        )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        ratings = organization_ratings()
        for organization in page:
            organization.rating = ratings.get(str(organization.pk))
        serializer = OrganizationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = OrganizationCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        organization = create_organization(owner=request.user, **serializer.validated_data)
        return Response(
            OrganizationSerializer(organization).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailView(PublicReadMixin, APIView):
    """GET/PUT `/organizations/<id>/` (docs/05_API_Design.md:316-341)."""

    permission_classes = [IsAuthenticated, IsOrganizationOwnerOrAdmin]

    def _get_object(self, pk):
        organization = get_organization_by_id(pk)
        if organization is None:
            raise NotFound("Organization not found.")
        return organization

    def get(self, request, pk):
        organization = self._get_object(pk)
        organization.rating = organization_rating(organization.pk)
        return Response(OrganizationDetailSerializer(organization).data)

    def put(self, request, pk):
        organization = self._get_object(pk)
        self.check_object_permissions(request, organization)

        serializer = OrganizationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = update_organization(organization, **serializer.validated_data)
        return Response(OrganizationSerializer(organization).data)


class OrganizationServicesView(PublicReadMixin, APIView):
    """GET/POST `/organizations/<id>/services/` (docs/05:358-361)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        organization = _get_organization_or_404(pk)
        services = list_services_for_organization(organization.pk)
        return Response(ServiceSerializer(services, many=True).data)

    def post(self, request, pk):
        organization = _get_organization_or_404(pk)
        _ensure_manager(request.user, organization)

        serializer = NestedServiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = create_service(organization=organization, **serializer.validated_data)
        return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)


class ServiceListCreateView(PublicReadMixin, APIView):
    """GET/POST `/services/` (docs/05_API_Design.md:365-391)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = request.query_params
        if "organization_id" in params:
            queryset = list_services_for_organization(params.get("organization_id"))
        else:
            queryset = list_services()

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        ratings = organization_ratings()
        for service in page:
            service.organization.rating = ratings.get(str(service.organization_id))
        serializer = ServiceListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = ServiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = serializer.validated_data["organization"]
        _ensure_manager(request.user, organization)

        service = create_service(**serializer.validated_data)
        return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)


class ServiceDetailView(PublicReadMixin, APIView):
    """GET/PUT/DELETE `/services/<id>/` (docs/05_API_Design.md:394-401)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return Response(ServiceSerializer(_get_service_or_404(pk)).data)

    def put(self, request, pk):
        service = _get_service_or_404(pk)
        _ensure_manager(request.user, service.organization)

        serializer = ServiceUpdateSerializer(data=_json_object(request))
        serializer.is_valid(raise_exception=True)
        service = update_service(service, **serializer.validated_data)
        return Response(ServiceSerializer(service).data)

    def delete(self, request, pk):
        service = _get_service_or_404(pk)
        _ensure_manager(request.user, service.organization)
        delete_service(service)
        return Response({"message": "Service deleted"})
