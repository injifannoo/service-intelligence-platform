import json
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.core.exceptions import GeminiRateLimitError
from app.main import app

client = TestClient(app)


def test_sentiment_short_text_validation_error():
    """Text shorter than minimum length must return HTTP 422."""
    response = client.post(
        "/api/v1/sentiment/analyze",
        json={"text": "ok"},
    )
    assert response.status_code == 422


@patch("app.features.sentiment.service.query_gemini")
def test_sentiment_analysis_success_flow(mock_query_gemini):
    """End-to-end sentiment analysis with valid structured JSON response from Gemini."""
    mock_llm_output = {
        "sentiment": "Positive",
        "sentiment_score": 0.85,
        "positive_aspects": ["Prompt customer service", "Clean onboarding"],
        "negative_aspects": [],
    }
    mock_query_gemini.return_value = json.dumps(mock_llm_output)

    payload = {
        "text": "The service was extraordinarily fast and their team communicated proactively.",
        "provider_id": "prov-123",
    }
    response = client.post("/api/v1/sentiment/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify camelCase serialization and field mappings
    assert data["sentiment"] == "Positive"
    assert data["sentimentScore"] == 0.85
    assert "Prompt customer service" in data["positiveAspects"]
    assert data["negativeAspects"] == []


@patch("app.features.sentiment.service.query_gemini")
def test_sentiment_handles_markdown_wrapped_json(mock_query_gemini):
    """Parser must sanitize markdown fences (```json ... ```) returned by LLM."""
    mock_payload = {
        "sentiment": "Mixed",
        "sentiment_score": 0.1,
        "positive_aspects": ["Good technical expertise"],
        "negative_aspects": ["Delayed delivery schedule"],
    }
    mock_query_gemini.return_value = f"```json\n{json.dumps(mock_payload)}\n```"

    payload = {
        "text": "Great engineering quality, but the project milestones were delayed by two weeks."
    }
    response = client.post("/api/v1/sentiment/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "Mixed"
    assert data["sentimentScore"] == 0.1
    assert "Good technical expertise" in data["positiveAspects"]
    assert "Delayed delivery schedule" in data["negativeAspects"]


@patch("app.features.sentiment.service.query_gemini")
def test_sentiment_fallback_on_gemini_error(mock_query_gemini):
    """Graceful degradation when Gemini raises an API exception."""
    mock_query_gemini.side_effect = GeminiRateLimitError(
        message="Gemini rate limit exceeded."
    )

    payload = {
        "text": "Review text submitted during high traffic load."
    }
    response = client.post("/api/v1/sentiment/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "Neutral"
    assert data["sentimentScore"] == 0.0
    assert any("Service error" in err for err in data["negativeAspects"])