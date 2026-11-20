"""Analytics URL routing."""

from django.urls import path
from .api import OrganizationAnalyticsDashboardView

app_name = "analytics"

urlpatterns = [
    path(
        "organizations/<uuid:organization_id>/analytics/dashboard/",
        OrganizationAnalyticsDashboardView.as_view(),
        name="organization-dashboard",
    ),
]