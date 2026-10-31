from app.core.exceptions import AIServiceException
from app.core.logging import logger
from app.features.recommendations.recommendation import build_recommendation_prompt
from app.features.recommendations.schemas import RecommendationRequest, RecommendationResponse
from app.core.gemini_service import query_gemini
from app.utils.response_parser import parse_and_validate_gemini_response


def get_recommendation(payload: RecommendationRequest) -> RecommendationResponse:
    """Coordinates prompt construction, Gemini inference, and response parsing."""
    requirement_text = getattr(payload, "requirement", None) or getattr(payload, "query", "")
    prompt = build_recommendation_prompt(requirement_text, payload.providers)
    fallback_provider = payload.providers[0] if payload.providers else None

    try:
        raw_response = query_gemini(prompt)
        return parse_and_validate_gemini_response(
            raw_text=raw_response,
            candidate_providers=payload.providers,
        )
    except AIServiceException as e:
        logger.error(f"AI Service Exception during recommendation: {e.message}")
        return RecommendationResponse(
            match_score=0,
            recommended_provider=fallback_provider,
            alternative_providers=[],
            reasoning=[f"Service error: {e.message}"],
            key_decision_factors=[],
        )
    except Exception as e:
        logger.error(f"Unexpected error during recommendation generation: {e}")
        return RecommendationResponse(
            match_score=0,
            recommended_provider=fallback_provider,
            alternative_providers=[],
            reasoning=[f"AI recommendation temporarily unavailable: {str(e)}"],
            key_decision_factors=[],
        )