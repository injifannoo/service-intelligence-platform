import uuid

import pytest
from rest_framework.test import APIClient

from features.organizations.models import Organization
from features.reviews.models import RATING_DIMENSIONS, Review, ReviewReport
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "Password123!"
REVIEWS_URL = "/api/v1/reviews/"

REVIEW_FIELDS = {
    "id",
    "user_id",
    "organization_id",
    "rating",
    "ratings",
    "comment",
    "verified",
    "created_at",
    "author_name",
}


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


def make_review(organization, user, **overrides):
    data = {
        "rating": 4,
        "quality": 4,
        "price": 4,
        "customer_service": 4,
        "speed": 4,
        "overall_experience": 4,
        "comment": "Solid work.",
        "verified": True,
    }
    data.update(overrides)
    return Review.objects.create(organization=organization, user=user, **data)


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


def detail_url(review):
    return f"/api/v1/reviews/{review.id}/"


def report_url(review):
    return f"/api/v1/reviews/{review.id}/report/"


def org_reviews_url(organization):
    return f"/api/v1/organizations/{organization.id}/reviews/"


def test_create_review_requires_authentication(client):
    organization = make_organization()

    response = client.post(
        REVIEWS_URL,
        {"organization_id": str(organization.id), "rating": 5},
        format="json",
    )

    assert response.status_code == 401
    assert error(response)["code"] == "NOT_AUTHENTICATED"


def test_create_review_fills_every_dimension_from_the_overall_rating(client):
    organization = make_organization()
    user = make_user()
    authenticate(client, user)

    response = client.post(
        REVIEWS_URL,
        {"organization_id": str(organization.id), "rating": 3},
        format="json",
    )

    assert response.status_code == 201
    review = response.json()["data"]
    assert set(review) == REVIEW_FIELDS
    assert review["rating"] == 3
    assert review["ratings"] == {dimension: 3 for dimension in RATING_DIMENSIONS}
    assert review["verified"] is False
    assert review["author_name"] == "Jane Doe"


def test_create_review_keeps_sent_dimensions_and_defaults_the_rest(client):
    organization = make_organization()
    user = make_user()
    authenticate(client, user)

    response = client.post(
        REVIEWS_URL,
        {
            "organization_id": str(organization.id),
            "rating": 4,
            "comment": "  Great team.  ",
            "ratings": {"quality": 5, "price": 2},
        },
        format="json",
    )

    assert response.status_code == 201
    review = response.json()["data"]
    assert review["ratings"] == {
        "quality": 5,
        "price": 2,
        "customer_service": 4,
        "speed": 4,
        "overall_experience": 4,
    }
    assert review["comment"] == "Great team."


def test_create_review_validates_rating_and_dimensions(client):
    organization = make_organization()
    authenticate(client, make_user())

    response = client.post(
        REVIEWS_URL,
        {
            "organization_id": str(organization.id),
            "rating": 9,
            "ratings": {"quality": 0, "custumer_service": 3},
        },
        format="json",
    )

    assert response.status_code == 400
    body = error(response)
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Please correct the highlighted fields."
    assert body["details"]["rating"] == ["Rating must be a whole number between 1 and 5."]
    assert body["details"]["ratings.quality"] == [
        "Each dimension must be a whole number between 1 and 5."
    ]
    assert body["details"]["ratings.custumer_service"] == ["Unknown rating dimension."]


def test_create_review_with_unknown_organization_is_not_found(client):
    authenticate(client, make_user())

    response = client.post(
        REVIEWS_URL,
        {"organization_id": str(uuid.uuid4()), "rating": 5},
        format="json",
    )

    assert response.status_code == 404
    assert error(response)["code"] == "NOT_FOUND"


def test_update_review_moves_the_overall_dimension(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user, rating=5, overall_experience=5)
    authenticate(client, user)

    response = client.put(detail_url(review), {"rating": 2}, format="json")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["rating"] == 2
    assert body["ratings"]["overall_experience"] == 2


def test_update_review_can_clear_the_comment_with_null(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user)
    authenticate(client, user)

    response = client.put(detail_url(review), {"comment": None}, format="json")

    assert response.status_code == 200
    assert response.json()["data"]["comment"] is None


def test_update_review_rejects_an_empty_payload(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user)
    authenticate(client, user)

    response = client.put(detail_url(review), {}, format="json")

    assert response.status_code == 400
    assert error(response)["code"] == "INVALID_PAYLOAD"


def test_update_and_delete_are_the_authors_alone(client):
    organization = make_organization()
    author = make_user()
    intruder = make_user(email="intruder@example.com")
    review = make_review(organization, author)
    authenticate(client, intruder)

    put = client.put(detail_url(review), {"rating": 1}, format="json")
    delete = client.delete(detail_url(review))

    assert put.status_code == 403
    assert error(put)["message"] == "You can only change your own review."
    assert delete.status_code == 403
    assert Review.objects.filter(pk=review.pk).exists()


def test_delete_review_removes_it_and_its_report(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user)
    ReviewReport.objects.create(review=review, reporter=user, reason="SPAM")
    authenticate(client, user)

    response = client.delete(detail_url(review))

    assert response.status_code == 200
    assert response.json()["data"] == {"message": "Review deleted"}
    assert not Review.objects.filter(pk=review.pk).exists()
    assert ReviewReport.objects.count() == 0


def test_report_review_requires_a_reason(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user)
    authenticate(client, user)

    response = client.post(report_url(review), {}, format="json")

    assert response.status_code == 400
    assert error(response)["details"]["reason"] == ["This field is required."]


def test_report_review_is_recorded_once(client):
    organization = make_organization()
    user = make_user()
    review = make_review(organization, user)
    authenticate(client, user)

    first = client.post(report_url(review), {"reason": "SPAM"}, format="json")
    second = client.post(report_url(review), {"reason": "SPAM"}, format="json")

    assert first.status_code == 201
    assert first.json()["data"] == {"message": "Review reported"}
    assert second.status_code == 409
    assert error(second)["code"] == "ALREADY_REPORTED"
    assert error(second)["message"] == "You have already reported this review."


def test_organization_reviews_are_public_and_named(client):
    organization = make_organization()
    user = make_user()
    make_review(organization, user, comment="Newest", rating=5)
    other = make_organization(name="Other Co")
    make_review(other, user, comment="Elsewhere")

    response = client.get(org_reviews_url(organization))

    assert response.status_code == 200
    rows = response.json()["data"]
    assert len(rows) == 1
    assert rows[0]["organization_name"] == "Addis Software Works"
    assert rows[0]["comment"] == "Newest"


def test_organization_reviews_missing_organization_is_not_found(client):
    response = client.get(f"/api/v1/organizations/{uuid.uuid4()}/reviews/")

    assert response.status_code == 404
    assert error(response)["code"] == "NOT_FOUND"
