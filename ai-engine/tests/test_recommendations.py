import json
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.core.exceptions import GeminiRateLimitError
from app.main import app

client = TestClient(app)

SAMPLE_PROVIDERS = [
    {
        "id": "prov-1",
        "name": "CloudSecure Tech",
        "description": "Enterprise cloud security and SOC audits.",
        "location": "Addis Ababa",
        "servicesOffered": ["Cloud Security", "Vulnerability Assessment"],
        "rating": 4.8,
        "priceLevel": "$$$",
    },
    {
        "id": "prov-2",
        "name": "QuickAudit Labs",
        "description": "Rapid compliance audits for startups.",
        "location": "Nairobi",
        "servicesOffered": ["Compliance", "Code Review"],
        "rating": 4.2,
        "priceLevel": "$$",
    },
]


def test_recommendation_empty_providers_validation_error():
    """Empty providers list must return HTTP 422 Unprocessable Entity."""
    response = client.post(
        "/api/v1/recommend",
        json={"requirement": "Enterprise security audit", "providers": []},
    )
    assert response.status_code == 422


def test_recommendation_short_query_validation_error():
    """Query shorter than minimum length must return HTTP 422."""
    response = client.post(
        "/api/v1/recommend",
        json={"query": "ab", "providers": SAMPLE_PROVIDERS},
    )
    assert response.status_code == 422


@patch("app.services.recommendation_service.query_gemini")
def test_recommendation_success_flow(mock_query_gemini):
    """End-to-end recommendation flow with valid structured JSON response from Gemini."""
    mock_llm_output = {
        "match_score": 92,
        "recommended_provider": "prov-1",
        "alternative_providers": ["prov-2"],
        "reasoning": [
            "CloudSecure Tech offers dedicated enterprise vulnerability assessment matching requirements."
        ],
        "key_decision_factors": [
            {
                "factor": "Security Specialization",
                "score": 0.95,
                "description": "Direct match for enterprise cloud security audit",
            }
        ],
    }
    mock_query_gemini.return_value = json.dumps(mock_llm_output)

    payload = {
        "query": "Need an enterprise cloud security audit for banking infrastructure",
        "providers": SAMPLE_PROVIDERS,
    }
    response = client.post("/api/v1/recommend", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify camelCase serialization per API contract
    assert data["matchScore"] == 92
    assert data["recommendedProvider"]["id"] == "prov-1"
    assert data["recommendedProvider"]["name"] == "CloudSecure Tech"
    assert len(data["alternativeProviders"]) == 1
    assert data["alternativeProviders"][0]["id"] == "prov-2"
    assert len(data["reasoning"]) >= 1
    assert data["keyDecisionFactors"][0]["factor"] == "Security Specialization"


@patch("app.services.recommendation_service.query_gemini")
def test_recommendation_handles_markdown_wrapped_json(mock_query_gemini):
    """Parser must sanitize markdown fences (```json ... ```) returned by LLM."""
    mock_payload = {
        "match_score": 85,
        "recommended_provider": "prov-2",
        "alternative_providers": [],
        "reasoning": ["Solid match for agile security reviews."],
        "key_decision_factors": [
            {
                "factor": "Turnaround Time",
                "score": 0.88,
                "description": "Rapid compliance audits",
            }
        ],
    }
    mock_query_gemini.return_value = f"```json\n{json.dumps(mock_payload)}\n```"

    payload = {
        "requirement": "Need quick compliance audit",
        "providers": SAMPLE_PROVIDERS,
    }
    response = client.post("/api/v1/recommend", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["matchScore"] == 85
    assert data["recommendedProvider"]["id"] == "prov-2"


@patch("app.services.recommendation_service.query_gemini")
def test_recommendation_fallback_on_gemini_error(mock_query_gemini):
    """Graceful degradation when Gemini raises an API exception."""
    mock_query_gemini.side_effect = GeminiRateLimitError(
        message="Gemini rate limit exceeded."
    )

    payload = {
        "query": "Need infrastructure security audit",
        "providers": SAMPLE_PROVIDERS,
    }
    response = client.post("/api/v1/recommend", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["matchScore"] == 0
    assert data["recommendedProvider"]["id"] == "prov-1"  # Fallback to candidate 0
    assert any("Service error" in r for r in data["reasoning"])