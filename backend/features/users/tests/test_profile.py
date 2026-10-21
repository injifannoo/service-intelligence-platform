import pytest
from rest_framework.test import APIClient

from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"
PROFILE_URL = "/api/v1/users/profile/"


@pytest.fixture
def client():
    return APIClient()


def create_user(**overrides):
    data = {"name": "Jane Doe", "email": "jane@example.com", "password": PASSWORD}
    data.update(overrides)
    return User.objects.create_user(**data)


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


def test_profile_requires_authentication(client):
    response = client.get(PROFILE_URL)

    assert response.status_code == 401
    assert error(response) == {
        "code": "NOT_AUTHENTICATED",
        "message": "Authentication credentials were not provided.",
    }


def test_profile_returns_the_documented_shape(client):
    user = create_user()
    authenticate(client, user)

    response = client.get(PROFILE_URL)

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data) == {"id", "name", "email", "role", "status", "created_at", "organization_id"}
    assert data["status"] is True
    assert data["organization_id"] is None
    assert "password" not in data


def test_profile_update_changes_name_and_email(client):
    user = create_user()
    authenticate(client, user)

    response = client.put(
        PROFILE_URL,
        {"name": "Janet Doe", "email": "JANET@example.com"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Janet Doe"
    assert response.json()["data"]["email"] == "janet@example.com"

    user.refresh_from_db()
    assert user.name == "Janet Doe"
    assert user.email == "janet@example.com"


def test_profile_update_requires_both_fields(client):
    user = create_user()
    authenticate(client, user)

    response = client.put(PROFILE_URL, {}, format="json")

    assert response.status_code == 400
    body = error(response)
    assert body["code"] == "VALIDATION_ERROR"
    assert set(body["details"]) == {"name", "email"}


def test_profile_update_rejects_another_users_email(client):
    user = create_user()
    create_user(name="Other User", email="other@example.com")
    authenticate(client, user)

    response = client.put(
        PROFILE_URL,
        {"name": user.name, "email": "OTHER@example.com"},
        format="json",
    )

    assert response.status_code == 400
    assert error(response)["details"]["email"] == ["A user with this email already exists."]


def test_profile_update_allows_keeping_the_current_email(client):
    user = create_user()
    authenticate(client, user)

    response = client.put(
        PROFILE_URL,
        {"name": user.name, "email": user.email},
        format="json",
    )

    assert response.status_code == 200


def test_profile_update_cannot_change_the_role(client):
    user = create_user()
    authenticate(client, user)

    response = client.put(
        PROFILE_URL,
        {"name": user.name, "email": user.email, "role": UserRole.SUPER_ADMIN},
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.role == UserRole.CUSTOMER


def test_refresh_token_is_not_accepted_as_an_access_token(client):
    user = create_user()
    tokens = client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    ).json()["data"]

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['refresh_token']}")
    response = client.get(PROFILE_URL)

    assert response.status_code == 401
    assert error(response)["code"] == "INVALID_TOKEN"
