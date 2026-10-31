from fastapi import APIRouter, HTTPException, status

from app.features.recommendations.schemas import RecommendationRequest, RecommendationResponse
from app.features.recommendations.service import get_recommendation

router = APIRouter()


@router.post(
    "/recommend",
    response_model=RecommendationResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Generate ranked provider recommendations",
    description="Evaluates user requirements against candidate providers using Gemini structured matching.",
)
def create_recommendation(payload: RecommendationRequest) -> RecommendationResponse:
    if not payload.providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider list cannot be empty",
        )

    return get_recommendation(payload)