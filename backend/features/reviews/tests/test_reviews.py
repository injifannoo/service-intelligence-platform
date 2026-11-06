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
def regular_user(db):
    return User.objects.create_user(  # type: ignore[attr-defined]
        email="reviewer@example.com",
        name="Reviewer User",
        password="securepassword123",
    )


@pytest.fixture
def sample_org(db):
    industry = Industry.objects.create(name="Technology", description="Tech and software")
    return Organization.objects.create(
        name="Addis Software Solutions",
        description="Leading tech firm in Addis Ababa",
        industry=industry,
        location="Bole, Addis Ababa",
    )


class TestReviewEndpoints:
    def test_create_and_list_reviews(self, api_client, regular_user, sample_org):
        api_client.force_authenticate(user=regular_user)
        
        # Create review
        payload = {"rating": 5, "comment": "Outstanding service and support!"}
        response = api_client.post(f"/api/v1/organizations/{sample_org.id}/reviews/", payload, format="json")
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True
        assert data["data"]["rating"] == 5

        # List reviews publicly
        api_client.logout()
        response = api_client.get(f"/api/v1/organizations/{sample_org.id}/reviews/")
        assert response.status_code == status.HTTP_200_OK
        list_data = response.json()
        assert list_data["success"] is True
        assert len(list_data["data"]) == 1
        assert list_data["data"][0]["comment"] == "Outstanding service and support!"