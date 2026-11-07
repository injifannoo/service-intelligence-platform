import io
import json
import urllib.error
from unittest.mock import MagicMock, patch
import pytest

from features.search.ai_client import AIEngineClient, AIEngineClientError


@pytest.fixture
def client():
    return AIEngineClient(base_url="http://test-ai-engine:8001", timeout=2.0)


class TestAIEngineClient:
    @patch("urllib.request.urlopen")
    def test_check_health_success(self, mock_urlopen, client):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"status": "ok", "service": "ai-engine"}).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        data = client.check_health()
        assert data["status"] == "ok"
        assert mock_urlopen.call_count == 1

    @patch("urllib.request.urlopen")
    def test_check_health_failure_raises_client_error(self, mock_urlopen, client):
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        with pytest.raises(AIEngineClientError) as exc_info:
            client.check_health()
        assert "Connection failed" in str(exc_info.value)

    @patch("urllib.request.urlopen")
    def test_generate_embeddings_success(self, mock_urlopen, client):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"embeddings": [[0.1, 0.2, 0.3]]}).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        vectors = client.generate_embeddings(["test query"])
        assert len(vectors) == 1
        assert vectors[0] == [0.1, 0.2, 0.3]

    def test_generate_embeddings_empty_input(self, client):
        vectors = client.generate_embeddings([])
        assert vectors == []

    @patch("urllib.request.urlopen")
    def test_generate_embeddings_network_failure(self, mock_urlopen, client):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test-ai-engine:8001/embeddings",
            code=500,
            msg="Internal Server Error",
            hdrs={},
            fp=io.BytesIO(b""),
        )

        with pytest.raises(AIEngineClientError) as exc_info:
            client.generate_embeddings(["error case"])
        assert "HTTP error 500" in str(exc_info.value)

    @patch("urllib.request.urlopen")
    def test_get_recommendations_success(self, mock_urlopen, client):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(
            {"recommendations": [{"service_id": "srv-123", "score": 0.95}]}
        ).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        results = client.get_recommendations(user_id="usr-1", limit=1)
        assert len(results) == 1
        assert results[0]["service_id"] == "srv-123"