import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.organizations.models import Industry, Organization, VerificationStatus
from features.organizations.services import create_organization
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def customer_user():
    return User.objects.create_user(
        email="customer@example.com",
        name="Customer User",
        password="TestPassword123!",
        role=UserRole.CUSTOMER,
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        email="other@example.com",
        name="Other User",
        password="TestPassword123!",
        role=UserRole.CUSTOMER,
    )


@pytest.fixture
def tech_industry():
    return Industry.objects.create(
        name="Technology Services",
        description="IT and software services",
    )


@pytest.fixture
def organization(customer_user, tech_industry):
    return create_organization(
        owner=customer_user,
        name="Acme Tech",
        industry_id=tech_industry.id,
        location="Addis Ababa",
    )


class TestOrganizationEndpoints:
    def test_list_organizations_public(self, api_client, organization):
        response = api_client.get("/api/v1/organizations/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["pagination"]["count"] == 1
        assert data["data"][0]["name"] == "Acme Tech"

    def test_create_organization_authenticated(self, api_client, customer_user, tech_industry):
        api_client.force_authenticate(user=customer_user)
        payload = {
            "name": "Beta Software",
            "industry_id": str(tech_industry.id),
            "location": "Bole, Addis Ababa",
            "website": "https://beta.example.com",
        }
        response = api_client.post("/api/v1/organizations/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Beta Software"
        assert data["data"]["verification_status"] == VerificationStatus.UNVERIFIED

        # Check role promotion
        customer_user.refresh_from_db()
        assert customer_user.role == UserRole.ORGANIZATION_OWNER

    def test_create_organization_unauthenticated_fails(self, api_client, tech_industry):
        payload = {
            "name": "Beta Software",
            "industry_id": str(tech_industry.id),
        }
        response = api_client.post("/api/v1/organizations/", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["success"] is False

    def test_update_organization_owner_succeeds(self, api_client, customer_user, organization):
        api_client.force_authenticate(user=customer_user)
        response = api_client.put(
            f"/api/v1/organizations/{organization.id}/",
            {"name": "Acme Global Tech"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Acme Global Tech"

    def test_update_organization_non_owner_forbidden(self, api_client, other_user, organization):
        api_client.force_authenticate(user=other_user)
        response = api_client.put(
            f"/api/v1/organizations/{organization.id}/",
            {"name": "Hacked Tech"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["success"] is False

    def test_submit_verification_claim(self, api_client, customer_user, organization):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(f"/api/v1/organizations/{organization.id}/verify/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["verification_status"] == VerificationStatus.PENDING