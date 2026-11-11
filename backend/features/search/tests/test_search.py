import pytest
from rest_framework import status
from rest_framework.test import APIClient

from features.organizations.models import Industry, Organization

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sample_org(db):
    industry = Industry.objects.create(name="Hospitality", description="Hotels and tourism")
    return Organization.objects.create(
        name="Grand Addis Hotel",
        description="Clean and affordable luxury hotel near the airport",
        industry=industry,
        location="Bole, Addis Ababa",
    )


class TestSearchEndpoints:
    def test_ai_semantic_search_endpoint(self, api_client, sample_org):
        payload = {"query": "hotel"}
        response = api_client.post("/api/v1/search/ai/", payload, format="json")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "results" in data["data"]
        assert len(data["data"]["results"]) >= 1
        assert data["data"]["results"][0]["name"] == "Grand Addis Hotel"

    def test_ai_semantic_search_empty_query_fails(self, api_client):
        payload = {"query": "   "}
        response = api_client.post("/api/v1/search/ai/", payload, format="json")
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["success"] is False