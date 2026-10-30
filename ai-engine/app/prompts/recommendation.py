import json
from typing import List
from app.prompts.loader import load_prompt
from app.schemas.recommendation import ProviderInput


def build_recommendation_prompt(requirement: str, providers: List[ProviderInput]) -> str:
    providers_payload = json.dumps([p.model_dump() for p in providers], indent=2)
    return load_prompt(
        "recommendation",
        requirement=requirement,
        providers_payload=providers_payload,
    )