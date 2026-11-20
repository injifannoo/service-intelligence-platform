"""Backwards-compatible re-export of centralized core.ai_client."""

from core.ai_client import AIEngineClient, AIEngineClientError, AIEngineError

__all__ = ["AIEngineClient", "AIEngineClientError", "AIEngineError"]