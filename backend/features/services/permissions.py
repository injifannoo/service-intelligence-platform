from rest_framework.permissions import BasePermission

from features.organizations.models import Organization
from features.organizations.permissions import is_organization_manager


class IsServiceManager(BasePermission):
    """Allows only the parent organization's owner or a platform admin.

    Object-level checks receive a Service, while creation checks an Organization
    before the service exists. Both are routed through the same ownership helper
    so the two paths cannot disagree.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        organization = obj.organization if hasattr(obj, "organization") else obj
        return isinstance(organization, Organization) and is_organization_manager(
            request.user, organization
        )
