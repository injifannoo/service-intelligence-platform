"""Analytics API endpoints."""

from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from features.organizations.models import Organization
from .selectors import get_organization_analytics


class OrganizationAnalyticsDashboardView(APIView):
    """GET `/api/v1/organizations/{id}/analytics/dashboard/`."""

    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        try:
            organization = Organization.objects.get(pk=organization_id)
        except Organization.DoesNotExist:
            return Response(
                {"success": False, "message": "Organization not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if organization.owner != request.user and not request.user.is_staff:
            raise PermissionDenied(
                "You do not have permission to view analytics for this organization."
            )

        analytics_data = get_organization_analytics(organization=organization)

        return Response(
            {
                "success": True,
                "data": analytics_data,
            },
            status=status.HTTP_200_OK,
        )