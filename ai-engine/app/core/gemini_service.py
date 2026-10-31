from typing import Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.core.config import settings
from app.core.exceptions import (
    GeminiAPIError,
    GeminiAPIException,
    GeminiRateLimitError,
    GeminiTimeoutError,
)
from app.core.logging import logger


class GeminiService:
    """Encapsulates the Google GenAI SDK client lifecycle and inference operations."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL_NAME
        self.client = genai.Client(api_key=self.api_key)

    def generate_content(
        self,
        prompt: str,
        response_mime_type: str = "application/json",
        temperature: float = 0.2,
    ) -> str:
        """
        Executes a prompt generation request to the Gemini API with structured error handling.
        """
        try:
            config = types.GenerateContentConfig(
                temperature=temperature,
                response_mime_type=response_mime_type,
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            if not response.text:
                raise GeminiAPIError("Gemini returned an empty text response.")
            return response.text

        except APIError as e:
            logger.error(f"Gemini API error occurred: {e}")
            if e.code == 429:
                raise GeminiRateLimitError(
                    message="Gemini API rate limit or quota exceeded.",
                    details={"code": e.code, "message": str(e)},
                )
            if e.code in (408, 504):
                raise GeminiTimeoutError(
                    message="Gemini API request timed out.",
                    details={"code": e.code, "message": str(e)},
                )
            raise GeminiAPIError(
                message=str(e),
                status_code=e.code or 500,
                details={"code": e.code, "message": str(e)},
            )
        except TimeoutError as e:
            logger.error(f"Gemini request timeout: {e}")
            raise GeminiTimeoutError(message=str(e))
        except Exception as e:
            logger.error(f"Unexpected error querying Gemini: {e}")
            raise GeminiAPIException(
                message=f"Gemini processing failure: {str(e)}",
                details={"error_type": type(e).__name__},
            )


# Default singleton instance
_default_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    global _default_gemini_service
    if _default_gemini_service is None:
        _default_gemini_service = GeminiService()
    return _default_gemini_service


def query_gemini(prompt: str) -> str:
    """
    Module-level backwards-compatible bridge for existing callers.
    """
    service = get_gemini_service()
    return service.generate_content(prompt=prompt)