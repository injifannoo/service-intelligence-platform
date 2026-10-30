from unittest.mock import patch
from pathlib import Path


def test_liveness_probe(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-engine"


def test_versioned_liveness_probe(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_readiness_probe_healthy(client):
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "ai-engine"
    assert "model" in data


@patch("app.api.routes.health.get_prompt_path")
def test_readiness_probe_missing_file_failure(mock_get_prompt_path, client):
    # Simulate a missing prompt template file
    mock_get_prompt_path.return_value = Path("/non/existent/path/template.txt")
    response = client.get("/health/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unready"
    assert len(data["errors"]) > 0