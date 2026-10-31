import json
import re
from typing import Any, Dict, List, Optional

from app.core.logging import logger
from app.features.recommendations.schemas import (
    KeyDecisionFactor,
    ProviderInput,
    RecommendationResponse,
)


def extract_json_payload(raw_text: str) -> str:
    """
    Strips markdown code fences and extracts raw JSON from model text outputs.
    """
    cleaned = raw_text.strip()

    # Pattern 1: Extract from markdown code fences (```json ... ``` or ``` ... ```)
    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(fence_pattern, cleaned, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Pattern 2: Extract between outer curly braces if extra text exists
    brace_match = re.search(r"(\{[\s\S]*\})", cleaned)
    if brace_match:
        return brace_match.group(1).strip()

    return cleaned


def parse_and_validate_gemini_response(
    raw_text: str,
    candidate_providers: Optional[List[ProviderInput]] = None,
) -> RecommendationResponse:
    """
    Parses, cleans, and validates Gemini JSON output into RecommendationResponse.
    Falls back gracefully if parsing or validation fails.
    """
    provider_map: Dict[str, ProviderInput] = {}
    if candidate_providers:
        for p in candidate_providers:
            provider_map[p.id] = p
            provider_map[p.name.lower()] = p

    try:
        json_str = extract_json_payload(raw_text)
        data: Dict[str, Any] = json.loads(json_str)

        # Normalize match_score
        raw_score = data.get("match_score", data.get("matchScore", 0))
        try:
            score = int(raw_score)
        except (ValueError, TypeError):
            score = 0
        data["match_score"] = max(0, min(100, score))

        # Reconcile recommended_provider if returned as ID or partial object
        rec_val = data.get("recommended_provider") or data.get("recommendedProvider")
        if isinstance(rec_val, str) and rec_val in provider_map:
            data["recommended_provider"] = provider_map[rec_val]
        elif isinstance(rec_val, dict) and "id" in rec_val and rec_val["id"] in provider_map:
            # Enrich with complete candidate metadata if available
            orig = provider_map[rec_val["id"]]
            data["recommended_provider"] = orig

        # Reconcile alternative_providers if returned as IDs
        alts = data.get("alternative_providers") or data.get("alternativeProviders", [])
        resolved_alts = []
        if isinstance(alts, list):
            for alt in alts:
                if isinstance(alt, str) and alt in provider_map:
                    resolved_alts.append(provider_map[alt])
                elif isinstance(alt, dict):
                    alt_id = alt.get("id")
                    if alt_id and alt_id in provider_map:
                        resolved_alts.append(provider_map[alt_id])
                    else:
                        resolved_alts.append(alt)
        data["alternative_providers"] = resolved_alts

        # Normalize reasoning to list of strings
        raw_reasoning = data.get("reasoning", [])
        if isinstance(raw_reasoning, str):
            data["reasoning"] = [raw_reasoning]
        elif not isinstance(raw_reasoning, list):
            data["reasoning"] = [str(raw_reasoning)]

        # Normalize key_decision_factors
        raw_factors = data.get("key_decision_factors") or data.get("keyDecisionFactors", [])
        normalized_factors = []
        if isinstance(raw_factors, list):
            for f in raw_factors:
                if isinstance(f, dict) and "factor" in f and "description" in f:
                    factor_score = float(f.get("score", 0.8))
                    normalized_factors.append(
                        KeyDecisionFactor(
                            factor=str(f["factor"]),
                            score=max(0.0, min(1.0, factor_score)),
                            description=str(f["description"]),
                        )
                    )
        data["key_decision_factors"] = normalized_factors

        return RecommendationResponse(**data)

    except Exception as e:
        logger.error(f"Failed to parse and validate Gemini response: {e}")
        first_candidate = candidate_providers[0] if candidate_providers else None
        return RecommendationResponse(
            match_score=0,
            recommended_provider=first_candidate,
            alternative_providers=[],
            reasoning=[f"Failed to parse AI response: {str(e)}"],
            key_decision_factors=[],
        )