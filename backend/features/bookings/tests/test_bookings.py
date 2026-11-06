import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.organizations.models import Industry, Organization
from features.services.models import Service
from features.users.models import User
from features.bookings.models import Booking

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_customer(db):
    return User.objects.create_user(  # type: ignore[attr-defined]
        email="customer@example.com",
        name="Customer User",
        password="securepassword123",
    )


@pytest.fixture
def user_owner(db):
    return User.objects.create_user(  # type: ignore[attr-defined]
        email="owner@example.com",
        name="Org Owner",
        password="securepassword123",
    )


@pytest.fixture
def sample_org(user_owner, db):
    industry = Industry.objects.create(name="Consulting", description="Business consulting")
    return Organization.objects.create(
        name="Addis Consulting Group",
        description="Top advisory firm",
        industry=industry,
        owner=user_owner,
        location="Bole, Addis Ababa",
    )


@pytest.fixture
def sample_service(sample_org, db):
    return Service.objects.create(
        organization=sample_org,
        name="Strategic Advisory",
        description="One-on-one consultation",
        price=150.00,
    )


class TestBookingEndpoints:
    def test_create_booking(self, api_client, user_customer, sample_org, sample_service):
        api_client.force_authenticate(user=user_customer)
        payload = {
            "organization_id": str(sample_org.id),
            "service_id": str(sample_service.id),
            "booking_date": "2026-12-01T10:00:00Z",
            "notes": "Looking forward to the session.",
        }
        response = api_client.post("/api/v1/bookings/", payload, format="json")
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "pending"
        assert data["data"]["notes"] == "Looking forward to the session."

    def test_organization_owner_view_bookings(self, api_client, user_customer, user_owner, sample_org, sample_service):
        # Customer creates booking
        Booking.objects.create(
            organization=sample_org,
            user=user_customer,
            service=sample_service,
            booking_date="2026-12-01T10:00:00Z",
        )

        # Owner views organization bookings
        api_client.force_authenticate(user=user_owner)
        response = api_client.get(f"/api/v1/organizations/{sample_org.id}/bookings/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["user_email"] == "customer@example.com"