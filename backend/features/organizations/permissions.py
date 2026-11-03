from rest_framework.permissions import BasePermission

from core.permissions import FULL_ADMIN_ROLES


class IsOrganizationOwnerOrAdmin(BasePermission):
    """Allows access only to the organization owner or platform administrators."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in FULL_ADMIN_ROLES:
            return True
        return obj.owner_id == request.user.id