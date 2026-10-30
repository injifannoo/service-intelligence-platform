from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import health, recommendations
from app.core.config import settings
from app.core.exceptions import (
    AIServiceException,
    GeminiAPIError,
    GeminiRateLimitError,
    GeminiTimeoutError,
    PromptTemplateNotFoundError,
    PromptVariableInterpolationError,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="ASIP AI Engine Service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Domain Exception Handlers conforming to 05_API_Design.md
@app.exception_handler(GeminiRateLimitError)
async def rate_limit_exception_handler(request: Request, exc: GeminiRateLimitError):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.exception_handler(GeminiTimeoutError)
async def timeout_exception_handler(request: Request, exc: GeminiTimeoutError):
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.exception_handler(GeminiAPIError)
async def gemini_api_error_handler(request: Request, exc: GeminiAPIError):
    return JSONResponse(
        status_code=exc.status_code if exc.status_code in range(400, 600) else status.HTTP_502_BAD_GATEWAY,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.exception_handler(PromptTemplateNotFoundError)
@app.exception_handler(PromptVariableInterpolationError)
async def prompt_exception_handler(request: Request, exc: AIServiceException):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


# Include routes under /api/v1 as well as root for health probes
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(health.router, tags=["Health Probe Root"])
app.include_router(recommendations.router, prefix="/api/v1", tags=["Recommendations"])