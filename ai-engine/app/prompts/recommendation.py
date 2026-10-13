import json
from typing import List
from app.schemas.recommendation import ProviderInput

def build_recommendation_prompt(requirement: str, providers: List[ProviderInput]) -> str:
    providers_payload = json.dumps([p.model_dump() for p in providers], indent=2)
    return f"""
    You are an expert service provider recommendation assistant.
    Analyze the following user requirement against the list of service providers and select the best match.

    User Requirement:
    "{requirement}"

    Available Service Providers:
    {providers_payload}

    Evaluate the best match and output strictly a JSON object using this schema:
    {{
      "recommendation": "<Explanation of why the top choice was selected>",
      "match_score": <integer score between 0 and 100>,
      "reasons": ["<Reason 1>", "<Reason 2>", "<Reason 3>"],
      "alternatives": ["<Alternative Provider Name 1>", "<Alternative Provider Name 2>"]
    }}
    """