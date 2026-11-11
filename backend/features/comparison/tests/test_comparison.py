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
def sample_org(db):
    user = User.objects.create_user(
        email="orgowner@example.com",
        name="Org Owner",
        password="password123",
    )
    industry = Industry.objects.create(
        name="Technology",
    )
    return Organization.objects.create(
        name="Test Tech Corp",
        description="A technology solutions provider.",
        location="Addis Ababa",
        verification_status="VERIFIED",
        industry=industry,
        owner=user,
    )


class TestComparisonEndpoints:
    def test_comparison_matrix_success(self, api_client, sample_org):
        response = api_client.post(
            "/api/v1/comparison/",
            {"organization_ids": [str(sample_org.id)]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["name"] == "Test Tech Corp"
        assert data["data"][0]["is_verified"] is True
        assert data["data"][0]["verification_status"] == "VERIFIED"
        assert data["data"][0]["industry"] == "Technology"