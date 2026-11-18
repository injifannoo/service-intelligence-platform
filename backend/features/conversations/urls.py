from django.urls import path

from .api import ConversationListCreateView, ServiceRequestListCreateView

app_name = "conversations"

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("requests/", ServiceRequestListCreateView.as_view(), name="service-request-list-create"),
]
