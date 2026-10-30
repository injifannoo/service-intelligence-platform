import pytest
from rest_framework.test import APIClient

from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"


@pytest.fixture
def client():
    return APIClient()


def create_user(**overrides):
    data = {"name": "Jane Doe", "email": "jane@example.com", "password": PASSWORD}
    data.update(overrides)
    return User.objects.create_user(**data)


def register(client, **overrides):
    payload = {"name": "Jane Doe", "email": "jane@example.com", "password": PASSWORD}
    payload.update(overrides)
    return client.post("/api/v1/auth/register/", payload, format="json")


def login(client, email="jane@example.com", password=PASSWORD):
    return client.post(
        "/api/v1/auth/login/",
        {"email": email, "password": password},
        format="json",
    )


def error(response):
    return response.json()["error"]


def test_register_creates_a_customer_with_hashed_password(client):
    response = register(client)

    assert response.status_code == 201
    assert response.json() == {"success": True, "data": {"message": "Account created"}}

    user = User.objects.get(email="jane@example.com")
    assert user.role == UserRole.CUSTOMER
    assert user.is_active is True
    assert user.check_password(PASSWORD)
    assert user.password != PASSWORD


def test_register_requires_name_email_and_password(client):
    response = register(client, name="", email="", password="")

    assert response.status_code == 400
    body = error(response)
    assert body["code"] == "VALIDATION_ERROR"
    assert set(body["details"]) == {"name", "email", "password"}


def test_register_rejects_short_password(client):
    response = register(client, password="short")

    assert response.status_code == 400
    assert error(response)["details"]["password"] == ["Must be at least 8 characters."]


def test_register_rejects_invalid_email(client):
    response = register(client, email="not-an-email")

    assert response.status_code == 400
    assert error(response)["details"]["email"] == ["Enter a valid email address."]


def test_register_rejects_duplicate_email_case_insensitively(client):
    create_user()

    response = register(client, email="JANE@example.com")

    assert response.status_code == 400
    assert error(response)["details"]["email"] == ["A user with this email already exists."]


def test_register_rejects_role_injection(client):
    response = register(client, role="SUPER_ADMIN")

    assert response.status_code == 400
    assert error(response)["details"]["role"] == ["Role cannot be set through registration."]
    assert User.objects.count() == 0


def test_login_returns_tokens_that_unlock_the_profile(client):
    create_user()

    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert set(body["data"]) == {"access_token", "refresh_token"}

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {body['data']['access_token']}")
    profile = client.get("/api/v1/users/profile/")

    assert profile.status_code == 200
    assert profile.json()["data"]["email"] == "jane@example.com"


def test_login_does_not_reveal_whether_the_email_exists(client):
    create_user()

    wrong_password = login(client, password="WrongPassword1!")
    unknown_email = login(client, email="nobody@example.com")

    for response in (wrong_password, unknown_email):
        assert response.status_code == 401
        assert error(response) == {
            "code": "INVALID_CREDENTIALS",
            "message": "Incorrect email or password.",
        }


def test_login_rejects_an_inactive_account(client):
    create_user(is_active=False)

    response = login(client)

    assert response.status_code == 403
    assert error(response)["code"] == "ACCOUNT_INACTIVE"


def test_login_requires_email_and_password(client):
    response = client.post("/api/v1/auth/login/", {}, format="json")

    assert response.status_code == 400
    assert error(response) == {
        "code": "VALIDATION_ERROR",
        "message": "Email and password are required.",
    }


def test_refresh_rotates_and_blacklists_the_presented_token(client):
    create_user()
    tokens = login(client).json()["data"]

    refreshed = client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": tokens["refresh_token"]},
        format="json",
    )

    assert refreshed.status_code == 200
    new_tokens = refreshed.json()["data"]
    assert new_tokens["refresh_token"] != tokens["refresh_token"]

    replay = client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": tokens["refresh_token"]},
        format="json",
    )
    assert replay.status_code == 401
    assert error(replay)["code"] == "INVALID_TOKEN"


def test_refresh_requires_a_token(client):
    response = client.post("/api/v1/auth/refresh/", {}, format="json")

    assert response.status_code == 401
    assert error(response) == {
        "code": "NOT_AUTHENTICATED",
        "message": "No refresh token was provided.",
    }


def test_refresh_rejects_an_access_token(client):
    create_user()
    access = login(client).json()["data"]["access_token"]

    response = client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": access},
        format="json",
    )

    assert response.status_code == 401
    assert error(response)["code"] == "INVALID_TOKEN"


def test_refresh_rejects_a_deactivated_user(client):
    user = create_user()
    refresh = login(client).json()["data"]["refresh_token"]
    user.is_active = False
    user.save(update_fields=["is_active"])

    response = client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": refresh},
        format="json",
    )

    assert response.status_code == 403
    assert error(response)["code"] == "ACCOUNT_INACTIVE"


def test_logout_blacklists_the_refresh_token(client):
    create_user()
    tokens = login(client).json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")

    response = client.post(
        "/api/v1/auth/logout/",
        {"refresh_token": tokens["refresh_token"]},
        format="json",
    )

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"message": "Logged out"}}

    replay = client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": tokens["refresh_token"]},
        format="json",
    )
    assert replay.status_code == 401
    assert error(replay)["code"] == "INVALID_TOKEN"


def test_logout_without_a_refresh_token_still_succeeds(client):
    create_user()
    access = login(client).json()["data"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    response = client.post("/api/v1/auth/logout/", {}, format="json")

    assert response.status_code == 200
    assert response.json()["data"] == {"message": "Logged out"}
