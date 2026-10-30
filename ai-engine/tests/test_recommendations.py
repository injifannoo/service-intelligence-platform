from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_recommendation_validation_error():
    # Empty providers list should return HTTP 422 (Pydantic validation)
    response = client.post(
        "/api/v1/recommend",
        json={"requirement": "Test", "providers": []},
    )
    assert response.status_code == 422