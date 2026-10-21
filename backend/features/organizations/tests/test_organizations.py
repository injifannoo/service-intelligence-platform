import uuid

import pytest
from rest_framework.test import APIClient

from features.organizations.models import Industry, Organization, VerificationStatus
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"
LIST_URL = "/api/v1/organizations/"

ORGANIZATION_FIELDS = {
    "id",
    "name",
    "description",
    "industry_id",
    "location",
    "phone",
    "website",
    "verification_status",
    "rating",
    "created_at",
}


@pytest.fixture
def client():
    return APIClient()


def make_user(email="jane@example.com", role=UserRole.CUSTOMER, **overrides):
    return User.objects.create_user(
        name="Jane Doe", email=email, password=PASSWORD, role=role, **overrides
    )


def make_industry(name="Software"):
    return Industry.objects.get_or_create(
        name=name, defaults={"description": f"{name} providers."}
    )[0]


def make_organization(industry=None, **overrides):
    data = {
        "name": "Addis Software Works",
        "description": "Custom web and mobile product engineering.",
        "industry": industry or make_industry(),
        "location": "Addis Ababa",
        "phone": "+251 11 555 0101",
        "website": "https://example.com/addis-software",
    }
    data.update(overrides)
    return Organization.objects.create(**data)


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


def detail_url(organization):
    return f"/api/v1/organizations/{organization.id}/"


def test_list_is_public_and_matches_the_documented_shape(client):
    organization = make_organization()

    response = client.get(LIST_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["pagination"] == {
        "count": 1,
        "next": None,
        "previous": None,
        "page_size": 20,
    }
    assert set(body["data"][0]) == ORGANIZATION_FIELDS
    assert body["data"][0]["id"] == str(organization.id)
    assert body["data"][0]["industry_id"] == str(organization.industry_id)
    assert body["data"][0]["rating"] is None


def test_list_ignores_a_stale_bearer_token(client):
    make_organization()
    client.credentials(HTTP_AUTHORIZATION="Bearer stale-token")

    response = client.get(LIST_URL)

    assert response.status_code == 200


def test_list_paginates_with_relative_links(client):
    for index in range(3):
        make_organization(name=f"Organization {index}")

    first = client.get(f"{LIST_URL}?page=1&page_size=2").json()
    second = client.get(f"{LIST_URL}?page=2&page_size=2").json()

    assert len(first["data"]) == 2
    assert first["pagination"]["count"] == 3
    assert first["pagination"]["next"] == "?page=2&page_size=2"
    assert first["pagination"]["previous"] is None
    assert len(second["data"]) == 1
    assert second["pagination"]["next"] is None
    assert second["pagination"]["previous"] == "?page=1&page_size=2"


def test_list_filters_by_search_name_and_description(client):
    software = make_industry("Software")
    marketing = make_industry("Digital Agency")
    make_organization(name="Alpha Works", description="Custom software", industry=software)
    make_organization(name="Beta Studio", description="Marketing campaigns", industry=marketing)

    by_name = client.get(f"{LIST_URL}?search=alpha").json()["data"]
    by_description = client.get(f"{LIST_URL}?search=marketing").json()["data"]

    assert [entry["name"] for entry in by_name] == ["Alpha Works"]
    assert [entry["name"] for entry in by_description] == ["Beta Studio"]


def test_list_filters_by_industry_name_case_insensitively(client):
    software = make_industry("Software")
    make_industry("AI")
    make_organization(name="Alpha Works", industry=software)

    response = client.get(f"{LIST_URL}?industry=software")

    assert [entry["name"] for entry in response.json()["data"]] == ["Alpha Works"]


def test_list_returns_nothing_for_an_unknown_industry(client):
    make_organization()

    response = client.get(f"{LIST_URL}?industry=Hospitality")

    assert response.json()["data"] == []
    assert response.json()["pagination"]["count"] == 0


def test_list_filters_by_location(client):
    make_organization(name="Alpha Works", location="Addis Ababa")
    make_organization(name="Beta Studio", location="Bahir Dar")

    response = client.get(f"{LIST_URL}?location=bahir")

    assert [entry["name"] for entry in response.json()["data"]] == ["Beta Studio"]


def test_list_rating_filter_matches_nothing_when_no_reviews_exist(client):
    make_organization()

    assert client.get(f"{LIST_URL}?rating=4").json()["data"] == []
    assert client.get(f"{LIST_URL}?price=1000").json()["data"] == []


def test_list_treats_zero_rating_and_price_as_no_filter(client):
    make_organization()

    assert len(client.get(f"{LIST_URL}?rating=0").json()["data"]) == 1
    assert len(client.get(f"{LIST_URL}?price=0").json()["data"]) == 1


def test_create_requires_authentication(client):
    response = client.post(LIST_URL, {"name": "Acme", "industry": "Software"}, format="json")

    assert response.status_code == 401
    assert error(response)["code"] == "NOT_AUTHENTICATED"


def test_create_makes_the_caller_the_owner_and_promotes_a_customer(client):
    industry = make_industry("Software")
    user = make_user()
    authenticate(client, user)

    response = client.post(
        LIST_URL,
        {
            "name": "Acme Technology",
            "industry": "software",
            "description": "Product engineering.",
            "location": "Addis Ababa",
            "phone": "+251 11 000 0000",
            "website": "https://example.com/acme",
        },
        format="json",
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert set(data) == ORGANIZATION_FIELDS
    assert data["name"] == "Acme Technology"
    assert data["industry_id"] == str(industry.id)
    assert data["verification_status"] == VerificationStatus.PENDING
    assert data["rating"] is None

    user.refresh_from_db()
    assert user.role == UserRole.ORGANIZATION_OWNER
    assert user.organization_id == uuid.UUID(data["id"])


def test_create_requires_name_and_industry(client):
    user = make_user()
    authenticate(client, user)

    response = client.post(LIST_URL, {}, format="json")

    assert response.status_code == 400
    body = error(response)
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Please correct the highlighted fields."
    assert body["details"] == {
        "name": ["This field is required."],
        "industry": ["This field is required."],
    }


def test_create_rejects_an_unknown_industry(client):
    user = make_user()
    authenticate(client, user)

    response = client.post(LIST_URL, {"name": "Acme", "industry": "Hospitality"}, format="json")

    assert response.status_code == 400
    assert error(response)["details"]["industry"] == ["Select a valid industry."]


def test_create_rejects_a_second_organization_for_the_same_user(client):
    user = make_user()
    user.organization = make_organization()
    user.save(update_fields=["organization"])
    make_industry("Software")
    authenticate(client, user)

    response = client.post(LIST_URL, {"name": "Second Org", "industry": "Software"}, format="json")

    assert response.status_code == 400
    assert error(response)["details"] == {
        "organization": [
            "You already manage an organization. "
            "One verified organization is allowed per legal business."
        ]
    }


def test_create_accumulates_every_validation_error(client):
    user = make_user()
    user.organization = make_organization()
    user.save(update_fields=["organization"])
    authenticate(client, user)

    response = client.post(LIST_URL, {}, format="json")

    assert response.status_code == 400
    assert set(error(response)["details"]) == {"name", "industry", "organization"}


def test_create_keeps_an_admin_role(client):
    user = make_user(email="admin@example.com", role=UserRole.ADMIN)
    make_industry("Software")
    authenticate(client, user)

    response = client.post(LIST_URL, {"name": "Acme", "industry": "Software"}, format="json")

    assert response.status_code == 201
    user.refresh_from_db()
    assert user.role == UserRole.ADMIN
    assert user.organization_id is not None


def test_detail_is_public_and_nests_industry_and_empty_catalogue(client):
    industry = make_industry("Software")
    organization = make_organization(industry=industry)

    response = client.get(detail_url(organization))

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data) == ORGANIZATION_FIELDS | {"services", "industry", "review_count"}
    assert data["services"] == []
    assert data["review_count"] == 0
    assert data["rating"] is None
    assert data["industry"] == {
        "id": str(industry.id),
        "name": "Software",
        "description": "Software providers.",
    }


def test_detail_ignores_a_stale_bearer_token(client):
    organization = make_organization()
    client.credentials(HTTP_AUTHORIZATION="Bearer stale-token")

    response = client.get(detail_url(organization))

    assert response.status_code == 200


@pytest.mark.parametrize(
    "identifier",
    ["00000000-0000-4000-8000-000000000999", "not-a-uuid"],
)
def test_detail_returns_the_bff_not_found_shape(client, identifier):
    response = client.get(f"/api/v1/organizations/{identifier}/")

    assert response.status_code == 404
    assert error(response) == {
        "code": "NOT_FOUND",
        "message": "Organization not found.",
    }


def test_update_requires_authentication(client):
    organization = make_organization()

    response = client.put(detail_url(organization), {"name": "Renamed"}, format="json")

    assert response.status_code == 401
    assert error(response)["code"] == "NOT_AUTHENTICATED"


def test_owner_can_fully_replace_an_organization(client):
    industry = make_industry("Software")
    organization = make_organization(
        industry=industry, verification_status=VerificationStatus.VERIFIED
    )
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(
        detail_url(organization),
        {"name": "Renamed Works"},
        format="json",
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data) == ORGANIZATION_FIELDS
    assert data["name"] == "Renamed Works"
    assert data["description"] is None
    assert data["location"] is None
    assert data["phone"] is None
    assert data["website"] is None
    assert data["industry_id"] == str(industry.id)
    assert data["verification_status"] == VerificationStatus.VERIFIED

    organization.refresh_from_db()
    assert organization.name == "Renamed Works"
    assert organization.description is None


def test_update_rejects_a_non_owner(client):
    organization = make_organization()
    user = make_user()
    authenticate(client, user)

    response = client.put(detail_url(organization), {"name": "Renamed"}, format="json")

    assert response.status_code == 403
    assert error(response)["code"] == "PERMISSION_DENIED"


def test_update_rejects_a_different_organizations_owner(client):
    organization = make_organization()
    other_organization = make_organization(name="Other Org")
    owner = make_user(organization=other_organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(detail_url(organization), {"name": "Renamed"}, format="json")

    assert response.status_code == 403


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.SUPER_ADMIN])
def test_platform_admins_can_update_any_organization(client, role):
    organization = make_organization()
    admin = make_user(email=f"{role.lower()}@example.com", role=role)
    authenticate(client, admin)

    response = client.put(detail_url(organization), {"name": "Renamed"}, format="json")

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Renamed"


def test_update_requires_a_name(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(detail_url(organization), {}, format="json")

    assert response.status_code == 400
    assert error(response)["details"] == {"name": ["This field is required."]}


def test_update_ignores_immutable_fields(client):
    industry = make_industry("Software")
    organization = make_organization(industry=industry)
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.put(
        detail_url(organization),
        {
            "name": "Renamed",
            "industry": "Hospitality",
            "verification_status": VerificationStatus.VERIFIED,
        },
        format="json",
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["industry_id"] == str(industry.id)
    assert data["verification_status"] == VerificationStatus.PENDING


def test_update_rejects_malformed_json(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)

    response = client.generic(
        "PUT",
        detail_url(organization),
        data="{not json",
        content_type="application/json",
    )

    assert response.status_code == 400
    assert error(response) == {
        "code": "INVALID_JSON",
        "message": "Request body must be valid JSON.",
    }


def test_update_returns_not_found_before_parsing_the_body(client):
    organization = make_organization()
    owner = make_user(organization=organization, role=UserRole.ORGANIZATION_OWNER)
    authenticate(client, owner)
    missing = "/api/v1/organizations/00000000-0000-4000-8000-000000000999/"

    response = client.generic(
        "PUT",
        missing,
        data="{not json",
        content_type="application/json",
    )

    assert response.status_code == 404
    assert error(response)["message"] == "Organization not found."
