from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.views import PublicReadMixin

from .models import SearchLog
from .selectors import search_organizations
from .serializers import AISearchRequestSerializer, SearchLogSerializer


class AISemanticSearchView(APIView):
    """POST `/api/v1/search/ai/` - Semantic & Multi-Attribute Search."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AISearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        query = data["query"]
        industry_id = data.get("industry_id")
        location = data.get("location")

        # Execute search query
        queryset = search_organizations(
            query=query,
            industry_id=industry_id,
            location=location,
        )

        results = [
            {
                "id": str(org.id),
                "name": org.name,
                "description": org.description,
                "location": org.location,
                "industry": org.industry.name if org.industry else None,
                "reason": "Matches your natural language and filter requirements.",
            }
            for org in queryset[:10]
        ]

        # Log search query if user is authenticated
        if request.user and request.user.is_authenticated:
            SearchLog.objects.create(
                user=request.user,
                query=query,
                filters_applied={"industry_id": str(industry_id) if industry_id else None, "location": location},
                results_count=len(results),
            )

        return Response({"results": results}, status=status.HTTP_200_OK)


class UserSearchHistoryView(PublicReadMixin, APIView):
    """GET `/api/v1/search/history/` - Retrieve authenticated user's search logs."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = SearchLog.objects.filter(user=request.user)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = SearchLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)