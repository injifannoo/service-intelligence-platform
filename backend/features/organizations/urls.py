from django.urls import path

from .api import (
    IndustryListView,
    OrganizationDetailView,
    OrganizationListCreateView,
    OrganizationServicesView,
    ServiceDetailView,
    ServiceListCreateView,
)

app_name = "organizations"

urlpatterns = [
    path("industries/", IndustryListView.as_view(), name="industries"),
    path("organizations/", OrganizationListCreateView.as_view(), name="organizations"),
    path(
        "organizations/<str:pk>/services/",
        OrganizationServicesView.as_view(),
        name="organization-services",
    ),
    path(
        "organizations/<str:pk>/",
        OrganizationDetailView.as_view(),
        name="organization-detail",
    ),
    path("services/", ServiceListCreateView.as_view(), name="services"),
    path("services/<str:pk>/", ServiceDetailView.as_view(), name="service-detail"),
]
