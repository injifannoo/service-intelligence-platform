"""Notification API endpoints."""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination

from .selectors import get_notification_by_id, get_unread_notification_count, get_user_notifications
from .serializers import NotificationSerializer
from .services import mark_all_notifications_as_read, mark_notification_as_read


class NotificationListView(APIView):
    """GET `/api/v1/notifications/`."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = get_user_notifications(user=request.user)
        unread_count = get_unread_notification_count(user=request.user)
        
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = NotificationSerializer(page, many=True)
        
        paginated_response = paginator.get_paginated_response(serializer.data)
        
        # Handle cases where pagination returns a dict or a direct list
        response_data = paginated_response.data
        if isinstance(response_data, list):
            results = response_data
            count = len(results)
            next_page = None
            previous_page = None
        else:
            count = response_data.get("count", len(serializer.data))
            next_page = response_data.get("next")
            previous_page = response_data.get("previous")
            results = response_data.get("results", serializer.data)

        return Response({
            "success": True,
            "data": {
                "unread_count": unread_count,
                "count": count,
                "next": next_page,
                "previous": previous_page,
                "results": results,
            }
        })

class NotificationMarkReadView(APIView):
    """POST `/api/v1/notifications/{id}/read/`."""

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = get_notification_by_id(notification_id, user=request.user)
        if not notification:
            raise NotFound("Notification not found.")

        updated = mark_notification_as_read(notification=notification)
        return Response({"success": True, "data": NotificationSerializer(updated).data})


class NotificationMarkAllReadView(APIView):
    """POST `/api/v1/notifications/read-all/`."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        mark_all_notifications_as_read(user=request.user)
        return Response({"success": True, "message": "All notifications marked as read."})