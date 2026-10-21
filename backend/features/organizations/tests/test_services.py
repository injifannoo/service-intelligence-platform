from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from features.organizations.models import Organization, Service
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"
SERVICES_URL = "/api/v1/services/"

SERVICE_FIELDS = {"id", "organization_id", "name", "description", "price", "status"}
LIST_FIELDS = SERVICE_FIELDS | {"organization_name", "organization_rating"}


@pytest.fixture
def client():
    return APIClient()


def make_user(email="jane@example.com", role=UserRole.CUSTOMER, **overrides):
    return User.objects.create_user(
        name="Jane Doe", email=email, password=PASSWORD, role=role, **overrides
    )


def make_organization(**overrides):
    data = {"name": "Addis Software Works", "location": "Addis Ababa"}
    data.update(overrides)
    return Organization.objects.create(**data)


def make_service(organization, **overrides):
    data = {"name": "Custom Web Application", "description": "Build", "price": 85000}
    data.update(overrides)
    return Service.objects.create(organization=organization, **data)


def authenticate(client, user):
    response = client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['data']['access_token']}")
    return client


def error(response):
    return response.json()["error"]


def nested_url(organization):
    return f"/api/v1/organizations/{organization.id}/services/"


def detail_url(service):
    return f"/api/v1/services/{service.id}/"


def test_nested_list_is_public_and_returns_the_service_shape(client):
    organization = make_organization()
    make_service(organization)

    response = client.get(nested_url(organization))

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert set(body["data"][0]) == SERVICE_FIELDS
    assert body["data"][0]["organization_id"] == str(organization.id)
    assert body["data"][0]["price"] == 85000


def test_nested_list_returns_not_found_for_an_unknown_organization(client):
    response = client.get("/api/v1/organizations/not-a-uuid/services/")

    assert response.status_code == 404
    assert error(response)["message"] == "Organization not found."


def test_nested_list_ignores_a_stale_bearer_token(client):
    organization = make_organization()
    make_service(organization)
    client.credentials(HTTP_AUTHORIZATION="Bearer stale-token")

    response = client.get(nested_url(organization))

    assert response.status_code == 200


def test_nested_create_requires_authentication(client):
    organization = make_organization()

    response = client.post(nested_url(organization), {"name": "Hosting"}, format="json")

    assert response.status_code == 401


def test_owner_can_create_a_service(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.post(
        nested_url(organization),
        {"name": "Hosting", "description": "Managed VPS", "price": 9000},
        format="json",
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert set(data) == SERVICE_FIELDS
    assert data["name"] == "Hosting"
    assert data["price"] == 9000
    assert data["status"] is True
    assert Service.objects.count() == 1


def test_nested_create_requires_a_name(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.post(nested_url(organization), {}, format="json")

    assert response.status_code == 400
    assert error(response)["details"] == {"name": ["This field is required."]}


def test_nested_create_rejects_a_negative_price(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.post(
        nested_url(organization), {"name": "Hosting", "price": -5}, format="json"
    )

    assert response.status_code == 400
    assert error(response)["details"] == {"price": ["Must be a positive number."]}


def test_nested_create_rejects_a_non_manager(client):
    organization = make_organization()
    user = make_user()
    authenticate(client, user)

    response = client.post(nested_url(organization), {"name": "Hosting"}, format="json")

    assert response.status_code == 403
    assert error(response) == {
        "code": "PERMISSION_DENIED",
        "message": "You do not manage this organization.",
    }


def test_admin_can_create_a_service_for_any_organization(client):
    organization = make_organization()
    admin = make_user(email="admin@example.com", role=UserRole.ADMIN)
    authenticate(client, admin)

    response = client.post(nested_url(organization), {"name": "Hosting"}, format="json")

    assert response.status_code == 201


def test_flat_list_is_public_and_decorated(client):
    organization = make_organization()
    make_service(organization)

    response = client.get(SERVICES_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["count"] == 1
    entry = body["data"][0]
    assert set(entry) == LIST_FIELDS
    assert entry["organization_name"] == "Addis Software Works"
    assert entry["organization_rating"] is None


def test_flat_list_filters_by_organization_id(client):
    first = make_organization(name="First")
    second = make_organization(name="Second")
    make_service(first, name="Alpha")
    make_service(second, name="Beta")

    response = client.get(f"{SERVICES_URL}?organization_id={first.id}")

    assert [entry["name"] for entry in response.json()["data"]] == ["Alpha"]


def test_flat_list_returns_nothing_for_an_unknown_organization_id(client):
    make_organization()
    make_service(make_organization(name="Other"))

    response = client.get(f"{SERVICES_URL}?organization_id=not-a-uuid")

    assert response.json()["data"] == []


def test_flat_create_requires_authentication(client):
    organization = make_organization()

    response = client.post(
        SERVICES_URL,
        {"name": "Hosting", "organization_id": str(organization.id)},
        format="json",
    )

    assert response.status_code == 401


def test_flat_create_uses_the_organization_id(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.post(
        SERVICES_URL,
        {
            "name": "Hosting",
            "organization_id": str(organization.id),
            "price": 9000,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["data"]["organization_id"] == str(organization.id)


def test_flat_create_requires_a_name(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.post(SERVICES_URL, {"organization_id": str(organization.id)}, format="json")

    assert response.status_code == 400
    assert error(response)["details"] == {"name": ["This field is required."]}


def test_flat_create_requires_a_valid_organization(client):
    user = make_user()
    authenticate(client, user)

    response = client.post(
        SERVICES_URL,
        {"name": "Hosting", "organization_id": "not-a-uuid"},
        format="json",
    )

    assert response.status_code == 400
    assert error(response)["details"] == {
        "organization_id": ["A valid organization_id is required."]
    }


def test_flat_create_rejects_a_non_manager(client):
    organization = make_organization()
    user = make_user()
    authenticate(client, user)

    response = client.post(
        SERVICES_URL,
        {"name": "Hosting", "organization_id": str(organization.id)},
        format="json",
    )

    assert response.status_code == 403
    assert error(response)["message"] == "You do not manage this organization."


def test_service_detail_is_public(client):
    organization = make_organization()
    service = make_service(organization)

    response = client.get(detail_url(service))

    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(service.id)


def test_service_detail_returns_not_found(client):
    response = client.get("/api/v1/services/00000000-0000-4000-8000-000000000999/")

    assert response.status_code == 404
    assert error(response) == {"code": "NOT_FOUND", "message": "Service not found."}


def test_owner_can_partially_update_a_service(client):
    organization = make_organization()
    service = make_service(organization, description="Original", price=100)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(detail_url(service), {"name": "Renamed"}, format="json")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "Renamed"
    assert data["description"] == "Original"
    assert data["price"] == 100
    assert data["status"] is True


def test_update_can_clear_optional_fields(client):
    organization = make_organization()
    service = make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(
        detail_url(service),
        {"description": None, "price": None, "status": False},
        format="json",
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["description"] is None
    assert data["price"] is None
    assert data["status"] is False


def test_update_validates_the_price(client):
    organization = make_organization()
    service = make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    not_a_number = client.put(detail_url(service), {"price": "abc"}, format="json")
    negative = client.put(detail_url(service), {"price": -1}, format="json")

    assert error(not_a_number)["details"] == {"price": ["Enter a number."]}
    assert error(negative)["details"] == {"price": ["Price cannot be negative."]}


def test_update_rejects_an_empty_name(client):
    organization = make_organization()
    service = make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(detail_url(service), {"name": "  "}, format="json")

    assert response.status_code == 400
    assert error(response)["details"] == {"name": ["Service name cannot be empty."]}


def test_update_rejects_a_non_manager(client):
    organization = make_organization()
    service = make_service(organization)
    user = make_user()
    authenticate(client, user)

    response = client.put(detail_url(service), {"name": "Renamed"}, format="json")

    assert response.status_code == 403


def test_update_returns_not_found_before_reading_the_body(client):
    organization = make_organization()
    make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.generic(
        "PUT",
        "/api/v1/services/00000000-0000-4000-8000-000000000999/",
        data="{not json",
        content_type="application/json",
    )

    assert response.status_code == 404
    assert error(response)["message"] == "Service not found."


def test_update_rejects_a_malformed_body(client):
    organization = make_organization()
    service = make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.generic(
        "PUT",
        detail_url(service),
        data="{not json",
        content_type="application/json",
    )

    assert response.status_code == 400
    assert error(response) == {
        "code": "INVALID_PAYLOAD",
        "message": "A JSON body is required.",
    }


def test_owner_can_delete_a_service(client):
    organization = make_organization()
    service = make_service(organization)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.delete(detail_url(service))

    assert response.status_code == 200
    assert response.json()["data"] == {"message": "Service deleted"}
    assert Service.objects.count() == 0


def test_delete_requires_authentication(client):
    organization = make_organization()
    service = make_service(organization)

    response = client.delete(detail_url(service))

    assert response.status_code == 401


def test_delete_rejects_a_non_manager(client):
    organization = make_organization()
    service = make_service(organization)
    user = make_user()
    authenticate(client, user)

    response = client.delete(detail_url(service))

    assert response.status_code == 403


def test_organization_detail_includes_its_services(client):
    organization = make_organization()
    service = make_service(organization)

    response = client.get(f"/api/v1/organizations/{organization.id}/")

    assert response.status_code == 200
    services = response.json()["data"]["services"]
    assert [entry["id"] for entry in services] == [str(service.id)]


def test_organization_price_filter_matches_organizations_with_affordable_services(client):
    cheap = make_organization(name="Cheap")
    pricey = make_organization(name="Pricey")
    make_service(cheap, price=Decimal("5000"))
    make_service(pricey, price=Decimal("90000"))

    response = client.get("/api/v1/organizations/?price=10000")

    assert [entry["name"] for entry in response.json()["data"]] == ["Cheap"]


def test_organization_search_matches_service_names(client):
    organization = make_organization(name="Alpha Works")
    make_service(organization, name="Kubernetes Migration")

    response = client.get("/api/v1/organizations/?search=kubernetes")

    assert [entry["name"] for entry in response.json()["data"]] == ["Alpha Works"]


def test_organization_rating_filter_matches_nothing_without_reviews(client):
    organization = make_organization()
    make_service(organization)

    assert client.get("/api/v1/organizations/?rating=4").json()["data"] == []
