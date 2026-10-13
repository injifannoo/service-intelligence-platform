from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.prompts.recommendation import build_recommendation_prompt
from app.services.gemini_service import query_gemini
from app.utils.response_parser import parse_and_validate_gemini_response
from app.core.exceptions import GeminiAPIException

def get_recommendation(payload: RecommendationRequest) -> RecommendationResponse:
    prompt = build_recommendation_prompt(payload.requirement, payload.providers)
    try:
        raw_response = query_gemini(prompt)
        return parse_and_validate_gemini_response(raw_response)
    except GeminiAPIException as e:
        return RecommendationResponse(
            recommendation="AI recommendation is temporarily unavailable.",
            match_score=0,
            reasons=[f"Service Error: {str(e)}"],
            alternatives=[]
        )