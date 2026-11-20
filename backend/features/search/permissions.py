from rest_framework.permissions import BasePermission


class CanAccessSearchHistory(BasePermission):
    """Ensures only authenticated users can view their search logs."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)