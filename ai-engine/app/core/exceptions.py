from typing import Any, Dict, Optional


class AIServiceException(Exception):
    """Base exception for all AI Engine domain errors."""

    def __init__(
        self,
        message: str,
        code: str = "AI_ENGINE_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class GeminiAPIException(AIServiceException):
    """Raised when an external Gemini API request fails."""

    def __init__(
        self,
        message: str,
        code: str = "GEMINI_API_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, code=code, details=details)


class GeminiAPIError(GeminiAPIException):
    """Raised for general Gemini API errors with an upstream status code."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, code="GEMINI_API_ERROR", details=details)
        self.status_code = status_code


class GeminiTimeoutError(GeminiAPIException):
    """Raised when a Gemini API request times out."""

    def __init__(
        self,
        message: str = "Gemini API request timed out",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, code="GEMINI_TIMEOUT_ERROR", details=details)


class GeminiRateLimitError(GeminiAPIException):
    """Raised when Gemini API quota or rate limits are exceeded."""

    def __init__(
        self,
        message: str = "Gemini API rate limit exceeded",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, code="GEMINI_RATE_LIMIT_ERROR", details=details)


class PromptTemplateNotFoundError(AIServiceException):
    """Raised when a requested prompt template file does not exist on disk."""

    def __init__(
        self,
        template_name: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        message = f"Prompt template '{template_name}' not found."
        super().__init__(message, code="PROMPT_TEMPLATE_NOT_FOUND", details=details)


class PromptVariableInterpolationError(AIServiceException):
    """Raised when required template variables are missing during formatting."""

    def __init__(
        self,
        template_name: str,
        missing_variable: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        message = f"Missing variable '{missing_variable}' for prompt template '{template_name}'."
        super().__init__(message, code="PROMPT_INTERPOLATION_ERROR", details=details)


class StructuredOutputParseError(AIServiceException):
    """Raised when structured JSON parsing or Pydantic validation fails."""

    def __init__(
        self,
        message: str = "Failed to parse structured output from model response",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, code="STRUCTURED_OUTPUT_PARSE_ERROR", details=details)