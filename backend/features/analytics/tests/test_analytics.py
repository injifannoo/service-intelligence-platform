import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.organizations.models import Industry, Organization
from features.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        email="analytics_owner@example.com",
        name="Analytics Owner",
        password="password123",
    )


@pytest.fixture
def unauthorized_user(db):
    return User.objects.create_user(
        email="unauthorized@example.com",
        name="Unauthorized User",
        password="password123",
    )


@pytest.fixture
def organization(db, owner_user):
    industry = Industry.objects.create(name="Analytics Tech")
    return Organization.objects.create(
        name="Insight Metrics Ltd",
        description="Analytics and insights.",
        location="Addis Ababa",
        verification_status="VERIFIED",
        industry=industry,
        owner=owner_user,
    )


class TestAnalyticsDashboard:
    def test_owner_can_view_dashboard(self, api_client, owner_user, organization):
        api_client.force_authenticate(user=owner_user)
        response = api_client.get(
            f"/api/v1/organizations/{organization.id}/analytics/dashboard/"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["organization_id"] == str(organization.id)
        assert data["data"]["organization_name"] == "Insight Metrics Ltd"
        assert "conversion_rate" in data["data"]
        assert "customer_sentiment_score" in data["data"]

    def test_non_owner_forbidden_from_dashboard(
        self, api_client, unauthorized_user, organization
    ):
        api_client.force_authenticate(user=unauthorized_user)
        response = api_client.get(
            f"/api/v1/organizations/{organization.id}/analytics/dashboard/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_request_unauthorized(self, api_client, organization):
        response = api_client.get(
            f"/api/v1/organizations/{organization.id}/analytics/dashboard/"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED