from fastapi import APIRouter, status

from app.schemas.sentiment import (
    SentimentAnalysisRequest,
    SentimentAnalysisResponse,
)
from app.services.sentiment_service import analyze_sentiment

router = APIRouter()


@router.post(
    "/analyze",
    response_model=SentimentAnalysisResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Analyze sentiment and extract service aspects from customer review",
    description="Processes customer review text and extracts sentiment polarity, score, and aspect breakdown using Gemini.",
)
def analyze_review_sentiment(
    payload: SentimentAnalysisRequest,
) -> SentimentAnalysisResponse:
    return analyze_sentiment(payload)