import hashlib
import math
import re
from typing import Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.core.config import settings
from app.core.exceptions import (
    AIServiceException,
    GeminiAPIError,
    GeminiAPIException,
    GeminiRateLimitError,
    GeminiTimeoutError,
)
from app.core.logging import logger

EMBEDDING_DIMENSIONS = 768


def _deterministic_local_embedding(text: str, dimensions: int = EMBEDDING_DIMENSIONS) -> list[float]:
    """Deterministic 768-d unit vector fallback when GEMINI_API_KEY is unset in local dev."""
    vec = [0.0] * dimensions
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        vec[0] = 1.0
        return vec
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if (digest[4] & 1) == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class GeminiService:
    """Encapsulates the Google GenAI SDK client lifecycle and inference operations."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL_NAME
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def generate_content(
        self,
        prompt: str,
        response_mime_type: str = "application/json",
        temperature: float = 0.2,
    ) -> str:
        """
        Executes a prompt generation request to the Gemini API with structured error handling.
        """
        if not self.client:
            raise GeminiAPIError("GEMINI_API_KEY is not configured.")
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

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"


def generate_text_embedding(
    text: str,
    task_type: str = "SEMANTIC_SIMILARITY",
    model: str = DEFAULT_EMBEDDING_MODEL,
) -> list[float]:
    """Generates a 768-dimensional embedding vector for a single text string."""
    service = get_gemini_service()
    if not service.client:
        logger.warning("GEMINI_API_KEY unset; returning deterministic local embedding.")
        return _deterministic_local_embedding(text)

    try:
        result = service.client.models.embed_content(
            model=model,
            contents=text,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )
        embeddings = getattr(result, "embeddings", None) or []
        if not embeddings or not getattr(embeddings[0], "values", None):
            raise AIServiceException("Gemini returned an empty embedding vector.")
        return list(embeddings[0].values)
    except APIError as e:
        logger.warning(f"Gemini embedding API unavailable ({e.code}); using deterministic fallback.")
        return _deterministic_local_embedding(text)
    except AIServiceException:
        raise
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise AIServiceException(f"Failed to generate embedding: {str(e)}") from e


def generate_batch_embeddings(
    texts: list[str],
    task_type: str = "SEMANTIC_SIMILARITY",
    model: str = DEFAULT_EMBEDDING_MODEL,
) -> list[list[float]]:
    """Generates 768-dimensional embedding vectors for a list of text strings."""
    service = get_gemini_service()
    if not service.client:
        logger.warning("GEMINI_API_KEY unset; returning deterministic local batch embeddings.")
        return [_deterministic_local_embedding(t) for t in texts]

    try:
        result = service.client.models.embed_content(
            model=model,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )
        embeddings = getattr(result, "embeddings", None) or []
        if len(embeddings) != len(texts):
            raise AIServiceException("Gemini returned mismatched batch embedding count.")
        return [list(item.values) for item in embeddings]
    except APIError as e:
        logger.warning(f"Gemini batch embedding API unavailable ({e.code}); using deterministic fallback.")
        return [_deterministic_local_embedding(t) for t in texts]
    except AIServiceException:
        raise
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise AIServiceException(f"Failed to generate batch embeddings: {str(e)}") from e
