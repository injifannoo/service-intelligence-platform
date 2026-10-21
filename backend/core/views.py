"""Reusable view behaviour for public read endpoints."""

from rest_framework.permissions import SAFE_METHODS, AllowAny


class PublicReadMixin:
    """Lets anyone read, while write methods keep the view's own auth rules.

    Authentication is skipped for safe methods so a stale or expired bearer
    token cannot turn a public directory listing into a 401.
    """

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return super().get_permissions()

    def perform_authentication(self, request):
        if request.method in SAFE_METHODS:
            return
        super().perform_authentication(request)
