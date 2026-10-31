from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.prompt_loader import get_prompt_path

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Liveness probe: verifies the FastAPI application process is running."""
    return {
        "status": "healthy",
        "service": "ai-engine",
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready")
def readiness_check():
    """Readiness probe: verifies runtime configuration and prompt file assets on disk."""
    errors = []

    # Verify Gemini API key configuration
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        errors.append("GEMINI_API_KEY is not configured or empty")

    # Verify critical prompt template files are accessible on disk
    REQUIRED_FEATURES = [
        "recommendations", 
        "sentiment", 
        "summarization"
        ]

    for feature in REQUIRED_FEATURES:
        prompt_file = get_prompt_path(feature)
        if not prompt_file.is_file():
            errors.append(f"Prompt features missing: {feature} prompt file not found at {prompt_file}")

    if errors:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unready",
                "service": "ai-engine",
                "errors": errors,
            },
        )

    return {
        "status": "ready",
        "service": "ai-engine",
        "model": settings.GEMINI_MODEL_NAME,
        "environment": settings.ENVIRONMENT,
    }