import json
from app.schemas.recommendation import RecommendationResponse
from app.core.logging import logger

def parse_and_validate_gemini_response(raw_text: str) -> RecommendationResponse:
    try:
        data = json.loads(raw_text)
        score = int(data.get("match_score", 0))
        data["match_score"] = max(0, min(100, score))
        return RecommendationResponse(**data)
    except Exception as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        return RecommendationResponse(
            recommendation="Unable to format AI recommendation properly.",
            match_score=0,
            reasons=[f"Parsing error: {str(e)}"],
            alternatives=[]
        )