from django.urls import path

from .api import (
    OrganizationDetailView,
    OrganizationListCreateView,
    OrganizationVerifyClaimView,
)

app_name = "organizations"

urlpatterns = [
    path("organizations/", OrganizationListCreateView.as_view(), name="list-create"),
    path("organizations/<uuid:organization_id>/", OrganizationDetailView.as_view(), name="detail"),
    path("organizations/<uuid:organization_id>/verify/", OrganizationVerifyClaimView.as_view(), name="verify-claim"),
]