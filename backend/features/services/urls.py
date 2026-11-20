from django.urls import path

from .api import (
    CategoryListCreateView,
    OrganizationServiceListCreateView,
    ServiceDetailView,
    ServiceListCreateView,
)

app_name = "services"

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("services/", ServiceListCreateView.as_view(), name="list-create"),
    path("services/<uuid:service_id>/", ServiceDetailView.as_view(), name="detail"),
    path(
        "organizations/<uuid:organization_id>/services/",
        OrganizationServiceListCreateView.as_view(),
        name="organization-services",
    ),
]
