import json
from typing import Any, Dict, List

from app.core.exceptions import AIServiceException
from app.core.logging import logger
from app.core.prompt_loader import load_prompt
from app.features.summarization.schemas import (
    ConsensusLabel,
    SummarizationRequest,
    SummarizationResponse,
)
from app.core.gemini_service import query_gemini
from app.utils.response_parser import extract_json_payload


def _normalize_consensus_label(raw: str) -> ConsensusLabel:
    val = (raw or "").strip().lower()
    if "overwhelming" in val:
        return ConsensusLabel.OVERWHELMINGLY_POSITIVE
    elif "mostly" in val or "positive" in val:
        return ConsensusLabel.MOSTLY_POSITIVE
    elif "need" in val or "improv" in val or "poor" in val or "negative" in val:
        return ConsensusLabel.NEEDS_IMPROVEMENT
    return ConsensusLabel.MIXED


def _format_reviews(reviews: List[str]) -> str:
    """Formats a list of review texts into numbered bullet points."""
    return "\n".join(f"{i + 1}. {text.strip()}" for i, text in enumerate(reviews) if text.strip())


def parse_summarization_response(
    raw_text: str, provider_name: str
) -> SummarizationResponse:
    """Extracts, cleans, and validates Gemini summarization output."""
    json_str = extract_json_payload(raw_text)
    data: Dict[str, Any] = json.loads(json_str)

    summary = str(data.get("summary", "Summary unavailable.")).strip()
    consensus = _normalize_consensus_label(
        data.get("overall_consensus", data.get("overallConsensus", "Mixed"))
    )

    raw_strengths = data.get("strengths", [])
    strengths = [str(s) for s in raw_strengths] if isinstance(raw_strengths, list) else []

    raw_weaknesses = data.get("weaknesses", [])
    weaknesses = [str(w) for w in raw_weaknesses] if isinstance(raw_weaknesses, list) else []

    return SummarizationResponse(
        provider_name=provider_name,
        summary=summary,
        strengths=strengths,
        weaknesses=weaknesses,
        overall_consensus=consensus,
    )


def summarize_reviews(payload: SummarizationRequest) -> SummarizationResponse:
    """Coordinates prompt interpolation, Gemini inference, and fallback handling."""
    formatted_reviews = _format_reviews(payload.reviews)
    prompt = load_prompt(
        "summarization",
        provider_name=payload.provider_name,
        reviews_text=formatted_reviews,
    )

    try:
        raw_output = query_gemini(prompt)
        return parse_summarization_response(
            raw_text=raw_output,
            provider_name=payload.provider_name,
        )
    except AIServiceException as e:
        logger.error(f"AI Service Exception during summarization: {e.message}")
        return SummarizationResponse(
            provider_name=payload.provider_name,
            summary="Review summarization is temporarily unavailable due to a service error.",
            strengths=[],
            weaknesses=[f"Service error: {e.message}"],
            overall_consensus=ConsensusLabel.MIXED,
        )
    except Exception as e:
        logger.error(f"Unexpected error during summarization: {e}")
        return SummarizationResponse(
            provider_name=payload.provider_name,
            summary="Review summarization is temporarily unavailable.",
            strengths=[],
            weaknesses=[f"Error: {str(e)}"],
            overall_consensus=ConsensusLabel.MIXED,
        )