from django.urls import path
from .api import OrganizationReviewListCreateView

app_name = "reviews"

urlpatterns = [
    path(
        "organizations/<uuid:organization_id>/reviews/",
        OrganizationReviewListCreateView.as_view(),
        name="organization-reviews",
    ),
]