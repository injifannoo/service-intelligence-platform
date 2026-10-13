class AIServiceException(Exception):
    """Base exception for AI engine errors."""
    pass

class GeminiAPIException(AIServiceException):
    """Raised when Gemini API request fails."""
    pass