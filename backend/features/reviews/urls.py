from django.urls import path

from .api import (
    OrganizationReviewsView,
    ReviewCreateView,
    ReviewDetailView,
    ReviewReportView,
)

app_name = "reviews"

urlpatterns = [
    path("reviews/", ReviewCreateView.as_view(), name="reviews"),
    path("reviews/<str:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path(
        "reviews/<str:pk>/report/",
        ReviewReportView.as_view(),
        name="review-report",
    ),
    path(
        "organizations/<str:pk>/reviews/",
        OrganizationReviewsView.as_view(),
        name="organization-reviews",
    ),
]
