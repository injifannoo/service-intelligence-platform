"""Booking API endpoints."""

from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from features.organizations.models import Organization
from features.services.models import Service

from .selectors import get_booking_by_id, get_organization_bookings, get_user_bookings
from .serializers import BookingCreateSerializer, BookingSerializer, BookingStatusUpdateSerializer
from .services import cancel_booking, create_booking, update_booking_status


class BookingListCreateView(APIView):
    """GET/POST `/api/v1/bookings/`."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = get_user_bookings(user=request.user)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = BookingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        organization = Organization.objects.filter(pk=data["organization_id"]).first()
        if not organization:
            raise NotFound("Organization not found.")

        service = None
        if data.get("service_id"):
            service = Service.objects.filter(pk=data["service_id"], organization=organization).first()
            if not service:
                raise NotFound("Service not found for this organization.")

        booking = create_booking(
            organization=organization,
            user=request.user,
            service=service,
            booking_date=data["booking_date"],
            notes=data.get("notes", ""),
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class OrganizationBookingListView(APIView):
    """GET `/api/v1/organizations/{id}/bookings/` (Owner/Staff view)."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request, organization_id):
        organization = Organization.objects.filter(pk=organization_id).first()
        if not organization:
            raise NotFound("Organization not found.")

        if organization.owner != request.user:
            raise PermissionDenied("You do not have permission to view bookings for this organization.")

        queryset = get_organization_bookings(organization_id=organization_id)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = BookingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class BookingDetailView(APIView):
    """GET/PATCH/DELETE `/api/v1/bookings/{id}/`."""

    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = get_booking_by_id(booking_id)
        if not booking:
            raise NotFound("Booking not found.")

        if booking.user != request.user and booking.organization.owner != request.user:
            raise PermissionDenied("You do not have permission to view this booking.")

        return Response({"success": True, "data": BookingSerializer(booking).data})

    def patch(self, request, booking_id):
        """Update booking status (organization owner) or cancel (booking owner)."""
        booking = get_booking_by_id(booking_id)
        if not booking:
            raise NotFound("Booking not found.")

        is_owner = booking.organization.owner == request.user
        is_booker = booking.user == request.user

        if not is_owner and not is_booker:
            raise PermissionDenied("You do not have permission to modify this booking.")

        if is_owner:
            serializer = BookingStatusUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            updated = update_booking_status(booking=booking, status=serializer.validated_data["status"])
            return Response({"success": True, "data": BookingSerializer(updated).data})
        else:
            updated = cancel_booking(booking=booking)
            return Response({"success": True, "data": BookingSerializer(updated).data})

    def delete(self, request, booking_id):
        booking = get_booking_by_id(booking_id)
        if not booking:
            raise NotFound("Booking not found.")

        if booking.user != request.user and booking.organization.owner != request.user:
            raise PermissionDenied("You do not have permission to delete this booking.")

        booking.delete()
        return Response({"success": True, "message": "Booking deleted successfully."}, status=status.HTTP_200_OK)