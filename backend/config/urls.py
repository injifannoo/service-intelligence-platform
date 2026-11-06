"""URL configuration for the platform API.

Feature slices register their routers here as they are implemented, keeping the
root router a thin composition point (docs/07_Project_Structure.md:113-115).

Sprint 1 & Sprint 2 scope: health check + users auth/profile endpoints.
"""

from django.contrib import admin
from django.urls import include, path

from core.health import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    path("health/", HealthView.as_view(), name="health"),
    path("api/v1/", include("features.users.urls", namespace="users")),
    path("api/v1/", include("features.organizations.urls", namespace="organizations")),
    path("api/v1/", include("features.services.urls", namespace="services")),
    path("api/v1/", include("features.search.urls", namespace="search")),
    path("api/v1/", include("features.reviews.urls", namespace="reviews")),
    path("api/v1/", include("features.bookings.urls", namespace="bookings")),
]
