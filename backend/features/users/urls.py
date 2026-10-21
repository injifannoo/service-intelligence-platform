from django.urls import path

from .api import LoginView, LogoutView, ProfileView, RefreshView, RegisterView

app_name = "users"

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/refresh/", RefreshView.as_view(), name="refresh"),
    path("users/profile/", ProfileView.as_view(), name="profile"),
]
