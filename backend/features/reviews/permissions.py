"""Review object and action permissions."""

from rest_framework.permissions import BasePermission


class IsReviewOwnerOrReadOnly(BasePermission):
    """Allows read access to all, but mutations only to the review author."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return obj.user == request.user