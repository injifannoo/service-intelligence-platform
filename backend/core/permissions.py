"""Cross-slice permission classes."""

from rest_framework.permissions import BasePermission

from features.users.models import UserRole

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}


class IsOrganizationOwnerOrAdmin(BasePermission):
    """Only the organization's owner, an admin, or a super admin may write."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ADMIN_ROLES:
            return True
        return user.organization_id is not None and str(user.organization_id) == str(obj.pk)
