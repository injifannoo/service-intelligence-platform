"""Comparison API endpoints."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import get_organizations_comparison_data
from .serializers import ComparisonRequestSerializer


class ComparisonMatrixView(APIView):
    """POST `/api/v1/comparison/`."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ComparisonRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        org_ids = serializer.validated_data["organization_ids"]
        comparison_data = get_organizations_comparison_data(organization_ids=org_ids)

        return Response({
            "success": True,
            "data": comparison_data
        }, status=status.HTTP_200_OK)