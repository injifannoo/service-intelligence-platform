import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.organizations.models import Industry
from features.organizations.services import create_organization
from features.services.models import Category
from features.services.services import create_service
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def owner():
    return User.objects.create_user(
        email="owner@example.com",
        name="Owner User",
        password="TestPassword123!",
        role=UserRole.ORGANIZATION_OWNER,
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
def admin_user():
    return User.objects.create_user(
        email="admin@example.com",
        name="Admin User",
        password="TestPassword123!",
        role=UserRole.ADMIN,
    )


@pytest.fixture
def industry():
    return Industry.objects.create(name="Technology Services")


@pytest.fixture
def organization(owner, industry):
    return create_organization(
        owner=owner,
        name="Acme Tech",
        industry_id=industry.id,
        location="Addis Ababa",
    )


@pytest.fixture
def category():
    return Category.objects.get(name="Custom Development")


@pytest.fixture
def service(organization, category):
    return create_service(
        organization=organization,
        name="Website Development",
        description="Design and build a marketing site.",
        price="5000.00",
        category_id=category.id,
    )


class TestCategories:
    def test_categories_are_public_and_seeded(self, api_client):
        response = api_client.get("/api/v1/categories/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["success"] is True
        assert body["pagination"]["count"] >= 8
        names = {row["name"] for row in body["data"]}
        assert "Custom Development" in names

    def test_admin_can_create_a_category(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(
            "/api/v1/categories/",
            {"name": "Legal", "description": "Legal services."},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["data"]["name"] == "Legal"

    def test_customer_cannot_create_a_category(self, api_client, other_user):
        api_client.force_authenticate(user=other_user)
        response = api_client.post(
            "/api/v1/categories/",
            {"name": "Legal"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["code"] == "PERMISSION_DENIED"


class TestServiceListAndCreate:
    def test_list_services_public(self, api_client, service, organization):
        response = api_client.get("/api/v1/services/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["pagination"]["count"] == 1
        row = body["data"][0]
        assert row["name"] == "Website Development"
        assert row["organization_id"] == str(organization.id)
        assert row["organization_name"] == "Acme Tech"
        assert row["category_name"] == "Custom Development"
        assert row["price"] == 5000.0
        assert row["status"] is True

    def test_list_filtered_by_organization(self, api_client, service, organization, owner, industry):
        other_organization = create_organization(
            owner=owner,
            name="Other Org",
            industry_id=industry.id,
        )
        create_service(organization=other_organization, name="Other Service")

        response = api_client.get(f"/api/v1/services/?organization_id={organization.id}")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["pagination"]["count"] == 1
        assert body["data"][0]["organization_id"] == str(organization.id)

    def test_list_filtered_by_category(self, api_client, service, category, organization):
        create_service(organization=organization, name="Uncategorised")

        response = api_client.get(f"/api/v1/services/?category_id={category.id}")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["pagination"]["count"] == 1
        assert body["data"][0]["category_id"] == str(category.id)

    def test_list_search_by_name(self, api_client, service):
        response = api_client.get("/api/v1/services/?search=website")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["pagination"]["count"] == 1

    def test_owner_can_publish_a_service(self, api_client, owner, organization, category):
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            "/api/v1/services/",
            {
                "organization_id": str(organization.id),
                "name": "Cloud Migration",
                "description": "Move the estate to managed cloud.",
                "price": "12000.50",
                "category_id": str(category.id),
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()["data"]
        assert data["name"] == "Cloud Migration"
        assert data["price"] == 12000.5
        assert data["category_name"] == "Custom Development"
        assert data["organization_id"] == str(organization.id)

    def test_creating_a_service_requires_authentication(self, api_client, organization):
        response = api_client.post(
            "/api/v1/services/",
            {"organization_id": str(organization.id), "name": "Cloud Migration"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_owner_cannot_publish_to_an_organization(
        self, api_client, other_user, organization
    ):
        api_client.force_authenticate(user=other_user)
        response = api_client.post(
            "/api/v1/services/",
            {"organization_id": str(organization.id), "name": "Cloud Migration"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["code"] == "PERMISSION_DENIED"

    def test_service_requires_a_name(self, api_client, owner, organization):
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            "/api/v1/services/",
            {"organization_id": str(organization.id), "name": "   "},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.json()["error"]["details"]

    def test_service_rejects_a_negative_price(self, api_client, owner, organization):
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            "/api/v1/services/",
            {
                "organization_id": str(organization.id),
                "name": "Refund",
                "price": "-1.00",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "price" in response.json()["error"]["details"]


class TestServiceDetail:
    def test_detail_is_public(self, api_client, service):
        response = api_client.get(f"/api/v1/services/{service.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["name"] == "Website Development"
        assert data["organization_verification_status"] == "UNVERIFIED"

    def test_missing_service_returns_404(self, api_client):
        response = api_client.get("/api/v1/services/00000000-0000-4000-8000-000000000000/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["error"]["code"] == "NOT_FOUND"

    def test_owner_can_update_a_service(self, api_client, owner, service, category):
        api_client.force_authenticate(user=owner)
        response = api_client.put(
            f"/api/v1/services/{service.id}/",
            {"name": "Web Platform Development", "price": "7500.00", "category_id": None},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["name"] == "Web Platform Development"
        assert data["price"] == 7500.0
        assert data["category_id"] is None
        service.refresh_from_db()
        assert service.category is None

    def test_non_owner_cannot_update_a_service(self, api_client, other_user, service):
        api_client.force_authenticate(user=other_user)
        response = api_client.put(
            f"/api/v1/services/{service.id}/",
            {"name": "Hijacked"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_update_any_service(self, api_client, admin_user, service):
        api_client.force_authenticate(user=admin_user)
        response = api_client.put(
            f"/api/v1/services/{service.id}/",
            {"status": False},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["status"] is False

    def test_owner_can_delete_a_service(self, api_client, owner, service):
        category_id = service.category_id
        api_client.force_authenticate(user=owner)
        response = api_client.delete(f"/api/v1/services/{service.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["message"] == "Service deleted"
        # Deleting a service must not delete the shared category vocabulary.
        assert Category.objects.filter(pk=category_id).exists()


class TestOrganizationServices:
    def test_nested_list_is_public(self, api_client, service, organization):
        response = api_client.get(f"/api/v1/organizations/{organization.id}/services/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["pagination"]["count"] == 1
        assert body["data"][0]["name"] == "Website Development"

    def test_owner_can_create_through_the_nested_route(
        self, api_client, owner, organization
    ):
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            f"/api/v1/organizations/{organization.id}/services/",
            {"name": "Mobile App Development", "price": "9000.00"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["data"]["organization_id"] == str(organization.id)

    def test_nested_create_uses_the_url_organization(self, api_client, owner, organization):
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            f"/api/v1/organizations/{organization.id}/services/",
            {
                "organization_id": "00000000-0000-4000-8000-000000000000",
                "name": "Mobile App Development",
            },
            format="json",
        )

        # The nested route is authoritative; an attacker cannot redirect the
        # write to another organization by adding an organization_id field.
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["data"]["organization_id"] == str(organization.id)
