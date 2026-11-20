"""Centralized HTTP client adapter for the FastAPI ai-engine microservice."""

import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class AIEngineClientError(Exception):
    """Raised when the AI Engine service returns an error or is unreachable."""


class AIEngineClient:
    """Resilient client wrapper for FastAPI ai-engine endpoints."""

    RETRYABLE_HTTP_CODES = {429, 502, 503, 504}

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: int = 2,
    ):
        self.base_url = (
            base_url or getattr(settings, "AI_ENGINE_BASE_URL", "http://ai_engine:8001")
        ).rstrip("/")
        self.timeout = (
            timeout
            if timeout is not None
            else float(getattr(settings, "AI_ENGINE_TIMEOUT", 30.0))
        )
        self.max_retries = max_retries

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"} if payload is not None else {}

        last_error: Optional[Exception] = None
        attempts = max(1, self.max_retries + 1)

        for attempt in range(attempts):
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    content = response.read().decode("utf-8")
                    return json.loads(content) if content else {}
            except urllib.error.HTTPError as exc:
                last_error = AIEngineClientError(f"HTTP error {exc.code}: {exc.reason}")
                if exc.code in self.RETRYABLE_HTTP_CODES and attempt < attempts - 1:
                    time.sleep(0.25 * (2**attempt))
                    continue
                logger.error("AI Engine HTTP error (%s) on %s: %s", exc.code, url, exc.reason)
                raise last_error from exc
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = AIEngineClientError(f"Connection failed: {str(exc)}")
                if attempt < attempts - 1:
                    time.sleep(0.25 * (2**attempt))
                    continue
                logger.error("AI Engine connection failed on %s: %s", url, exc)
                raise last_error from exc
            except json.JSONDecodeError as exc:
                logger.error("AI Engine returned invalid JSON on %s: %s", url, exc)
                raise AIEngineClientError(f"Invalid JSON response: {str(exc)}") from exc

        raise last_error or AIEngineClientError("AI Engine request failed")

    def check_health(self) -> dict[str, Any]:
        """Calls GET /health on ai-engine."""
        return self._request(method="GET", path="/health")

    def generate_embedding(
        self,
        text: str,
        task_type: str = "SEMANTIC_SIMILARITY",
    ) -> list[float]:
        """Calls POST /api/v1/embeddings/generate for a single 768-dim text vector."""
        if not text or not text.strip():
            return []
        data = self._request(
            method="POST",
            path="/api/v1/embeddings/generate",
            payload={"text": text.strip(), "task_type": task_type},
        )
        return data.get("embedding", [])

    def generate_embeddings(
        self,
        texts: list[str],
        task_type: str = "SEMANTIC_SIMILARITY",
    ) -> list[list[float]]:
        """Calls POST /api/v1/embeddings/batch for batch 768-dim text vectors."""
        if not texts:
            return []
        data = self._request(
            method="POST",
            path="/api/v1/embeddings/batch",
            payload={"texts": texts, "task_type": task_type},
        )
        return data.get("embeddings", [])

    def rank_similarity(
        self,
        *,
        query_vector: list[float],
        candidates: list[dict[str, Any]],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Calls POST /api/v1/embeddings/similarity."""
        if not query_vector or not candidates:
            return []
        data = self._request(
            method="POST",
            path="/api/v1/embeddings/similarity",
            payload={
                "query_vector": query_vector,
                "candidates": candidates,
                "top_k": top_k,
            },
        )
        return data.get("results", [])

    def analyze_sentiment(
        self,
        *,
        text: str,
        provider_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Calls POST /api/v1/sentiment on ai-engine."""
        payload: dict[str, Any] = {"text": text}
        if provider_id:
            payload["provider_id"] = str(provider_id)
        return self._request(method="POST", path="/api/v1/sentiment", payload=payload)

    def summarize_reviews(
        self,
        *,
        provider_name: str,
        reviews: list[str],
        provider_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Calls POST /api/v1/summarize on ai-engine."""
        payload: dict[str, Any] = {
            "provider_name": provider_name,
            "reviews": reviews,
        }
        if provider_id:
            payload["provider_id"] = str(provider_id)
        return self._request(method="POST", path="/api/v1/summarize", payload=payload)

    def recommend_providers(
        self,
        *,
        query: str,
        providers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Calls POST /api/v1/recommendations with FastAPI ProviderInput schema."""
        return self._request(
            method="POST",
            path="/api/v1/recommendations",
            payload={"query": query, "providers": providers},
        )

    def get_recommendations(
        self,
        user_id: str,
        context: Optional[dict[str, Any]] = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Backwards-compatible wrapper used by legacy callers and unit tests."""
        payload = {
            "user_id": user_id,
            "context": context or {},
            "limit": limit,
        }
        data = self._request(method="POST", path="/recommendations", payload=payload)
        return data.get("recommendations", [])


ServiceIntelAIClient = AIEngineClient
AIEngineError = AIEngineClientError
ServiceIntelAIClient = AIEngineClient
AIEngineError = AIEngineClientError
