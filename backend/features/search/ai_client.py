"""HTTP client adapter for interacting with the ai-engine microservice."""

import json
import logging
import urllib.error
import urllib.request
from typing import Any, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class AIEngineClientError(Exception):
    """Base exception for AI Engine service interaction failures."""
    pass


class AIEngineClient:
    """Client wrapper for communication with the FastAPI ai-engine microservice."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or getattr(settings, "AI_ENGINE_BASE_URL", "http://ai-engine:8001")).rstrip("/")
        self.timeout = timeout or getattr(settings, "AI_ENGINE_TIMEOUT", 5.0)

    def _request(self, method: str, path: str, payload: Optional[dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"} if payload is not None else {}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                content = response.read().decode("utf-8")
                return json.loads(content) if content else {}
        except urllib.error.HTTPError as exc:
            logger.error("AI Engine HTTP error (%s) on %s: %s", exc.code, url, exc.reason)
            raise AIEngineClientError(f"HTTP error {exc.code}: {exc.reason}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            logger.error("AI Engine connection failed on %s: %s", url, exc)
            raise AIEngineClientError(f"Connection failed: {str(exc)}") from exc
        except json.JSONDecodeError as exc:
            logger.error("AI Engine returned invalid JSON on %s: %s", url, exc)
            raise AIEngineClientError(f"Invalid JSON response: {str(exc)}") from exc

    def check_health(self) -> dict[str, Any]:
        """Calls GET /health on ai-engine."""
        return self._request(method="GET", path="/health")

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Calls POST /embeddings on ai-engine to generate vector representations.

        Args:
            texts: List of strings to encode into dense vector representations.

        Returns:
            List of float vectors (384-dimensional dense vectors from all-MiniLM-L6-v2).
        """
        if not texts:
            return []
        data = self._request(method="POST", path="/embeddings", payload={"texts": texts})
        return data.get("embeddings", [])

    def get_recommendations(
        self,
        user_id: str,
        context: Optional[dict[str, Any]] = None,
        limit: int = 5,
    ) -> List[dict[str, Any]]:
        """Calls POST /recommendations on ai-engine for personalized service ranking."""
        payload = {
            "user_id": user_id,
            "context": context or {},
            "limit": limit,
        }
        data = self._request(method="POST", path="/recommendations", payload=payload)
        return data.get("recommendations", [])