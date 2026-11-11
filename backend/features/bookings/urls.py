from django.urls import path
from .api import BookingDetailView, BookingListCreateView, OrganizationBookingListView

app_name = "bookings"

urlpatterns = [
    path("bookings/", BookingListCreateView.as_view(), name="booking-list-create"),
    path("bookings/<uuid:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
    path("organizations/<uuid:organization_id>/bookings/", OrganizationBookingListView.as_view(), name="organization-bookings"),
]