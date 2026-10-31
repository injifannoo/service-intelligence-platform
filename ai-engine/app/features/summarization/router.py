from fastapi import APIRouter, status

from app.features.summarization.schemas import (
    SummarizationRequest,
    SummarizationResponse,
)
from app.features.summarization.service import summarize_reviews

router = APIRouter()


@router.post(
    "/summarize",
    response_model=SummarizationResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Synthesize reviews into executive provider summary",
    description="Aggregates multiple customer reviews to extract strengths, weaknesses, executive summary, and overall consensus using Gemini.",
)
def summarize_provider_reviews(
    payload: SummarizationRequest,
) -> SummarizationResponse:
    return summarize_reviews(payload)