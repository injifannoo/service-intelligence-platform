"""Core health check and telemetry endpoints."""

import logging
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from features.search.ai_client import AIEngineClient, AIEngineClientError

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """System health check endpoint verifying database connectivity and external service reachability."""

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # Database verification
        db_healthy = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as exc:
            logger.error("Health check database probe failed: %s", exc)
            db_healthy = False

        if not db_healthy:
            return Response(
                {"success": False, "data": {"status": "unhealthy"}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Verbose diagnostics if requested (?verbose=true)
        if request.query_params.get("verbose") == "true":
            ai_engine_status = "unavailable"
            try:
                client = AIEngineClient(timeout=1.5)
                ai_data = client.check_health()
                if ai_data.get("status") == "ok":
                    ai_engine_status = "connected"
            except (AIEngineClientError, Exception):
                ai_engine_status = "unreachable"

            return Response(
                {
                    "success": True,
                    "data": {
                        "status": "ok",
                        "components": {
                            "database": "connected",
                            "ai_engine": ai_engine_status,
                        },
                    },
                },
                status=status.HTTP_200_OK,
            )

        # Standard baseline envelope expected by test_health
        return Response(
            {"success": True, "data": {"status": "ok"}},
            status=status.HTTP_200_OK,
        )