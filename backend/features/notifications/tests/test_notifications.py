import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.users.models import User
from features.notifications.models import Notification
from features.notifications.services import create_notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_recipient(db):
    return User.objects.create_user(  # type: ignore[attr-defined]
        email="recipient@example.com",
        name="Recipient User",
        password="securepassword123",
    )


class TestNotificationEndpoints:
    def test_list_notifications_and_unread_count(self, api_client, user_recipient):
        create_notification(
            user=user_recipient,
            title="Booking Confirmed",
            message="Your booking has been confirmed.",
            notification_type=Notification.NotificationType.BOOKING_UPDATE,
        )
        create_notification(
            user=user_recipient,
            title="New Review",
            message="You received a 5-star review.",
            notification_type=Notification.NotificationType.REVIEW_RECEIVED,
        )

        api_client.force_authenticate(user=user_recipient)
        response = api_client.get("/api/v1/notifications/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["unread_count"] == 2
        assert len(data["data"]["results"]) == 2

    def test_mark_notification_as_read(self, api_client, user_recipient):
        notif = create_notification(
            user=user_recipient,
            title="System Alert",
            message="Maintenance scheduled.",
        )

        api_client.force_authenticate(user=user_recipient)
        response = api_client.post(f"/api/v1/notifications/{notif.id}/read/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_read"] is True

    def test_mark_all_notifications_as_read(self, api_client, user_recipient):
        create_notification(user=user_recipient, title="Alert 1", message="Test 1")
        create_notification(user=user_recipient, title="Alert 2", message="Test 2")

        api_client.force_authenticate(user=user_recipient)
        response = api_client.post("/api/v1/notifications/read-all/")

        assert response.status_code == status.HTTP_200_OK
        assert Notification.objects.filter(user=user_recipient, is_read=False).count() == 0