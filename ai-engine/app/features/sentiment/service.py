import json
from typing import Any, Dict

from app.core.exceptions import AIServiceException
from app.core.logging import logger
from app.core.prompt_loader import load_prompt
from app.features.sentiment.schemas import (
    SentimentAnalysisRequest,
    SentimentAnalysisResponse,
    SentimentLabel,
)
from app.core.gemini_service import query_gemini
from app.utils.response_parser import extract_json_payload


def _normalize_sentiment_label(raw: str) -> SentimentLabel:
    val = (raw or "").strip().capitalize()
    if "Pos" in val:
        return SentimentLabel.POSITIVE
    elif "Neg" in val:
        return SentimentLabel.NEGATIVE
    elif "Mix" in val:
        return SentimentLabel.MIXED
    return SentimentLabel.NEUTRAL


def _normalize_score(value: Any, default: float = 0.0) -> float:
    try:
        val = float(value)
        return max(-1.0, min(1.0, val))
    except (TypeError, ValueError):
        return default


def parse_sentiment_response(raw_text: str) -> SentimentAnalysisResponse:
    """Extracts, cleans, and validates Gemini sentiment analysis output."""
    json_str = extract_json_payload(raw_text)
    data: Dict[str, Any] = json.loads(json_str)

    sentiment = _normalize_sentiment_label(data.get("sentiment", "Neutral"))
    score = _normalize_score(data.get("sentiment_score", data.get("sentimentScore", 0.0)))

    raw_pos = data.get("positive_aspects", data.get("positiveAspects", []))
    positive_aspects = [str(item) for item in raw_pos] if isinstance(raw_pos, list) else []

    raw_neg = data.get("negative_aspects", data.get("negativeAspects", []))
    negative_aspects = [str(item) for item in raw_neg] if isinstance(raw_neg, list) else []

    return SentimentAnalysisResponse(
        sentiment=sentiment,
        sentiment_score=score,
        positive_aspects=positive_aspects,
        negative_aspects=negative_aspects,
    )


def analyze_sentiment(payload: SentimentAnalysisRequest) -> SentimentAnalysisResponse:
    """Orchestrates sentiment prompt interpolation, Gemini inference, and fallback handling."""
    prompt = load_prompt("sentiment", review_text=payload.text)

    try:
        raw_output = query_gemini(prompt)
        return parse_sentiment_response(raw_output)
    except AIServiceException as e:
        logger.error(f"AI Service Exception during sentiment analysis: {e.message}")
        return SentimentAnalysisResponse(
            sentiment=SentimentLabel.NEUTRAL,
            sentiment_score=0.0,
            positive_aspects=[],
            negative_aspects=[f"Service error: {e.message}"],
        )
    except Exception as e:
        logger.error(f"Unexpected error during sentiment analysis: {e}")
        return SentimentAnalysisResponse(
            sentiment=SentimentLabel.NEUTRAL,
            sentiment_score=0.0,
            positive_aspects=[],
            negative_aspects=[f"Analysis unavailable: {str(e)}"],
        )