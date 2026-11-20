import hashlib
import json
from typing import Any

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.views import PublicReadMixin

from .models import SearchLog
from .selectors import semantic_search_organizations
from .serializers import AISearchRequestSerializer, SearchLogSerializer


class AISemanticSearchView(APIView):
    """POST `/api/v1/search/ai/` - Hybrid pgvector Semantic & Multi-Attribute Search."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AISearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data: dict[str, Any] = dict(serializer.validated_data)

        query = data["query"]
        industry_id = data.get("industry_id")
        location = data.get("location")
        verified_only = bool(request.data.get("verified_only") or request.data.get("verifiedOnly", False))
        try:
            limit = max(1, min(50, int(request.data.get("limit", 10))))
        except (TypeError, ValueError):
            limit = 10

        cache_payload = json.dumps(
            {
                "q": query.strip().lower(),
                "industry_id": str(industry_id) if industry_id else None,
                "location": location.strip().lower() if location else None,
                "verified_only": verified_only,
                "limit": limit,
            },
            sort_keys=True,
        )
        cache_key = f"search:ai:{hashlib.sha256(cache_payload.encode('utf-8')).hexdigest()}"
        results = cache.get(cache_key)

        if results is None:
            results = semantic_search_organizations(
                query=query,
                industry_id=str(industry_id) if industry_id else None,
                location=location,
                verified_only=verified_only,
                limit=limit,
            )
            cache.set(cache_key, results, timeout=120)

        # Log search query if user is authenticated
        if request.user and request.user.is_authenticated:
            SearchLog.objects.create(
                user=request.user,
                query=query,
                filters_applied={
                    "industry_id": str(industry_id) if industry_id else None,
                    "location": location,
                    "verified_only": verified_only,
                },
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