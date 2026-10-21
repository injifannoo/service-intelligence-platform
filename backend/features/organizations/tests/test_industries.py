import uuid

import pytest
from rest_framework.test import APIClient

from features.organizations.models import Industry

pytestmark = pytest.mark.django_db

URL = "/api/v1/industries/"


@pytest.fixture
def client():
    return APIClient()


def make_industry(number, name, description=None):
    return Industry.objects.create(
        id=uuid.UUID(f"00000000-0000-4000-8000-{number:012d}"),
        name=name,
        description=description,
    )


def test_industries_are_public_and_enveloped(client):
    make_industry(21, "Software", "Software providers.")

    response = client.get(URL)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"] == [
        {
            "id": "00000000-0000-4000-8000-000000000021",
            "name": "Software",
            "description": "Software providers.",
        }
    ]


def test_industries_are_ordered_by_id_for_seed_parity(client):
    make_industry(23, "IT Services")
    make_industry(21, "Software")
    make_industry(22, "AI")

    response = client.get(URL)

    assert [entry["name"] for entry in response.json()["data"]] == [
        "Software",
        "AI",
        "IT Services",
    ]


def test_industries_ignore_a_stale_bearer_token(client):
    make_industry(21, "Software")
    client.credentials(HTTP_AUTHORIZATION="Bearer stale-token")

    response = client.get(URL)

    assert response.status_code == 200
