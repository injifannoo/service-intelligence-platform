from django.urls import path
from .api import NotificationListView, NotificationMarkAllReadView, NotificationMarkReadView

app_name = "notifications"

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<uuid:notification_id>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("notifications/read-all/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
]