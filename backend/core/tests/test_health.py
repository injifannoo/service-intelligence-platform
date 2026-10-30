from rest_framework.test import APIClient


def test_health_endpoint_uses_the_standard_envelope():
    response = APIClient().get("/api/v1/health/")

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "ok"}}
