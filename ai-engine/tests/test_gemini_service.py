from unittest.mock import MagicMock, patch
import pytest
from google.genai.errors import APIError

from app.core.exceptions import (
    GeminiAPIError,
    GeminiRateLimitError,
    GeminiTimeoutError,
)
from app.core.gemini_service import GeminiService


@patch("app.core.gemini_service.genai.Client")
def test_gemini_service_generate_content_success(mock_client_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"status": "success", "result": "valid"}'
    mock_client.models.generate_content.return_value = mock_response
    mock_client_class.return_value = mock_client

    service = GeminiService(api_key="test-mock-key")
    result = service.generate_content(prompt="Test prompt")

    assert result == '{"status": "success", "result": "valid"}'
    mock_client.models.generate_content.assert_called_once()


@patch("app.core.gemini_service.genai.Client")
def test_gemini_service_rate_limit_mapping(mock_client_class):
    mock_client = MagicMock()
    mock_error = APIError(429, {"error": {"message": "Quota exceeded", "code": 429}})
    mock_client.models.generate_content.side_effect = mock_error
    mock_client_class.return_value = mock_client

    service = GeminiService(api_key="test-mock-key")
    with pytest.raises(GeminiRateLimitError):
        service.generate_content(prompt="Test prompt")


@patch("app.core.gemini_service.genai.Client")
def test_gemini_service_timeout_mapping(mock_client_class):
    mock_client = MagicMock()
    mock_error = APIError(504, {"error": {"message": "Deadline exceeded", "code": 504}})
    mock_client.models.generate_content.side_effect = mock_error
    mock_client_class.return_value = mock_client

    service = GeminiService(api_key="test-mock-key")
    with pytest.raises(GeminiTimeoutError):
        service.generate_content(prompt="Test prompt")


@patch("app.core.gemini_service.genai.Client")
def test_gemini_service_generic_api_error_mapping(mock_client_class):
    mock_client = MagicMock()
    mock_error = APIError(500, {"error": {"message": "Internal server error", "code": 500}})
    mock_client.models.generate_content.side_effect = mock_error
    mock_client_class.return_value = mock_client

    service = GeminiService(api_key="test-mock-key")
    with pytest.raises(GeminiAPIError) as exc_info:
        service.generate_content(prompt="Test prompt")
    assert exc_info.value.status_code == 500