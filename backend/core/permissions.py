"""Cross-slice permission classes (Sprint 1 & Sprint 2 scope)."""

from rest_framework.permissions import BasePermission

from features.users.models import UserRole

ADMIN_ROLES = {UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN}
FULL_ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}
SUPER_ADMIN_ROLES = {UserRole.SUPER_ADMIN}


class IsPlatformModerator(BasePermission):
    """Moderator, Admin, or Super Admin."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ADMIN_ROLES)


class IsPlatformAdmin(BasePermission):
    """Admin or Super Admin (can approve verifications)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in FULL_ADMIN_ROLES)


class IsPlatformSuperAdmin(BasePermission):
    """Super Admin only."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in SUPER_ADMIN_ROLES)
