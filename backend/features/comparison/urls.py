from django.urls import path
from .api import ComparisonMatrixView

app_name = "comparison"

urlpatterns = [
    path("comparison/", ComparisonMatrixView.as_view(), name="comparison-matrix"),
]