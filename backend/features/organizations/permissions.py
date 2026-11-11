from rest_framework.permissions import BasePermission

from core.permissions import FULL_ADMIN_ROLES


def is_organization_manager(user, organization) -> bool:
    """True when the user owns the organization or is a platform admin.

    Ownership is checked through `Organization.owner_id`, not the
    `ORGANIZATION_OWNER` role: creating an organization while still a customer
    promotes the account, but the link is the authoritative tenant boundary.
    """
    if not user or not user.is_authenticated:
        return False
    if user.role in FULL_ADMIN_ROLES:
        return True
    return organization.owner_id == user.id


class IsOrganizationOwnerOrAdmin(BasePermission):
    """Allows access only to the organization owner or platform administrators."""

    def has_object_permission(self, request, view, obj):
        return is_organization_manager(request.user, obj)
