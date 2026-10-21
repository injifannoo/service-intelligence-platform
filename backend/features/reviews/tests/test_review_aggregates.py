import pytest
from rest_framework.test import APIClient

from features.organizations.models import Organization
from features.reviews.models import Review
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"


@pytest.fixture
def client():
    return APIClient()


def make_user(email="jane@example.com", role=UserRole.CUSTOMER):
    return User.objects.create_user(name="Jane Doe", email=email, password=PASSWORD, role=role)


def make_organization(name="Addis Software Works", **overrides):
    data = {"name": name, "location": "Addis Ababa"}
    data.update(overrides)
    return Organization.objects.create(**data)


def make_review(organization, user, rating):
    return Review.objects.create(
        organization=organization,
        user=user,
        rating=rating,
        quality=rating,
        price=rating,
        customer_service=rating,
        speed=rating,
        overall_experience=rating,
        verified=True,
    )


def test_list_organization_rating_is_the_rounded_average(client):
    user = make_user()
    rated = make_organization("Rated Co")
    make_review(rated, user, 5)
    make_review(rated, user, 4)
    make_organization("Unrated Co")

    response = client.get("/api/v1/organizations/")

    assert response.status_code == 200
    rows = {row["name"]: row["rating"] for row in response.json()["data"]}
    assert rows["Rated Co"] == 4.5
    assert rows["Unrated Co"] is None


def test_detail_exposes_rating_and_review_count(client):
    user = make_user()
    organization = make_organization()
    make_review(organization, user, 5)
    make_review(organization, user, 3)

    response = client.get(f"/api/v1/organizations/{organization.id}/")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["rating"] == 4.0
    assert body["review_count"] == 2
    assert body["services"] == []


def test_rating_filter_matches_average_at_or_above(client):
    user = make_user()
    high = make_organization("High Co")
    low = make_organization("Low Co")
    make_review(high, user, 5)
    make_review(low, user, 2)

    response = client.get("/api/v1/organizations/?rating=4")

    assert response.status_code == 200
    names = [row["name"] for row in response.json()["data"]]
    assert names == ["High Co"]


def test_service_list_decorates_parent_rating(client):
    user = make_user()
    organization = make_organization()
    make_review(organization, user, 4)
    from features.organizations.models import Service

    Service.objects.create(organization=organization, name="Consulting", price=1000)

    response = client.get("/api/v1/services/")

    assert response.status_code == 200
    row = response.json()["data"][0]
    assert row["organization_name"] == "Addis Software Works"
    assert row["organization_rating"] == 4.0
