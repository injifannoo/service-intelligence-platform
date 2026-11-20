from django.urls import path
from .api import AISemanticSearchView, UserSearchHistoryView

app_name = "search"

urlpatterns = [
    path("search/ai/", AISemanticSearchView.as_view(), name="ai-search"),
    path("search/history/", UserSearchHistoryView.as_view(), name="search-history"),
]