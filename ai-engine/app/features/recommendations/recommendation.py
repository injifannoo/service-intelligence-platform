import json
from typing import List
from app.core.prompt_loader import load_prompt
from app.features.recommendations.schemas import ProviderInput


def build_recommendation_prompt(requirement: str, providers: List[ProviderInput]) -> str:
    providers_payload = json.dumps([p.model_dump() for p in providers], indent=2)
    return load_prompt(
        "recommendations",
        requirement=requirement,
        providers_payload=providers_payload,
    )