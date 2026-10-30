from fastapi import APIRouter, HTTPException, status
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse

router = APIRouter()

# Note: Do NOT add prefix="/recommend" to APIRouter() if the decorator uses "/recommend"
@router.post(
    "/recommend",
    response_model=RecommendationResponse,
    response_model_by_alias=True # Guarantees JSON outputs camelCase (matchScore, etc.)
)
async def get_recommendation(payload: RecommendationRequest):
    if not payload.providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider list cannot be empty"
        )

    # Example response matching your RecommendationResponse schema
    return RecommendationResponse(
        matchScore=85,
        recommendedProvider=payload.providers[0],
        alternativeProviders=payload.providers[1:] if len(payload.providers) > 1 else [],
        reasoning=["Strong match based on query requirements."],
        keyDecisionFactors=[
            {
                "factor": "Service Relevance",
                "score": 0.9,
                "description": "Direct match with offered services"
            }
        ]
    )