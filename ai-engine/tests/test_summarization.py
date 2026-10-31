import json
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.core.exceptions import GeminiRateLimitError
from app.main import app

client = TestClient(app)

SAMPLE_REVIEWS = [
    "Delivered the cloud architecture ahead of schedule and with high engineering standards.",
    "Very responsive customer service, though billing documentation was a bit slow to arrive.",
    "Outstanding security hardening and thorough vulnerability report.",
]


def test_summarization_empty_reviews_validation_error():
    """Empty reviews list must return HTTP 422."""
    response = client.post(
        "/api/v1/summary/summarize",
        json={"provider_name": "Apex Cloud", "reviews": []},
    )
    assert response.status_code == 422


def test_summarization_short_provider_name_validation_error():
    """Provider name shorter than minimum length must return HTTP 422."""
    response = client.post(
        "/api/v1/summary/summarize",
        json={"provider_name": "A", "reviews": SAMPLE_REVIEWS},
    )
    assert response.status_code == 422


@patch("app.features.summarization.service.query_gemini")
def test_summarization_success_flow(mock_query_gemini):
    """End-to-end review summarization with valid structured JSON response from Gemini."""
    mock_llm_output = {
        "summary": "Apex Cloud demonstrates exceptional security engineering and timely delivery.",
        "strengths": ["Rapid project delivery", "Thorough security analysis"],
        "weaknesses": ["Slow billing turnaround"],
        "overall_consensus": "Mostly Positive",
    }
    mock_query_gemini.return_value = json.dumps(mock_llm_output)

    payload = {
        "provider_name": "Apex Cloud",
        "reviews": SAMPLE_REVIEWS,
    }
    response = client.post("/api/v1/summary/summarize", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify camelCase serialization and schema contracts
    assert data["providerName"] == "Apex Cloud"
    assert "exceptional security engineering" in data["summary"]
    assert len(data["strengths"]) == 2
    assert "Slow billing turnaround" in data["weaknesses"]
    assert data["overallConsensus"] == "Mostly Positive"


@patch("app.features.summarization.service.query_gemini")
def test_summarization_handles_markdown_wrapped_json(mock_query_gemini):
    """Parser must sanitize markdown fences (```json ... ```) returned by LLM."""
    mock_payload = {
        "summary": "Solid and reliable consulting partner across enterprise deployments.",
        "strengths": ["Deep cloud expertise"],
        "weaknesses": ["High service costs"],
        "overall_consensus": "Overwhelmingly Positive",
    }
    mock_query_gemini.return_value = f"```json\n{json.dumps(mock_payload)}\n```"

    payload = {
        "provider_name": "Apex Cloud",
        "reviews": SAMPLE_REVIEWS,
    }
    response = client.post("/api/v1/summary/summarize", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["providerName"] == "Apex Cloud"
    assert data["overallConsensus"] == "Overwhelmingly Positive"
    assert "Deep cloud expertise" in data["strengths"]


@patch("app.features.summarization.service.query_gemini")
def test_summarization_fallback_on_gemini_error(mock_query_gemini):
    """Graceful degradation when Gemini raises an API exception."""
    mock_query_gemini.side_effect = GeminiRateLimitError(
        message="Gemini quota exceeded."
    )

    payload = {
        "provider_name": "Apex Cloud",
        "reviews": SAMPLE_REVIEWS,
    }
    response = client.post("/api/v1/summary/summarize", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["providerName"] == "Apex Cloud"
    assert "temporarily unavailable" in data["summary"]
    assert any("Service error" in w for w in data["weaknesses"])
    assert data["overallConsensus"] == "Mixed"