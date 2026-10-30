from pydantic import BaseModel, Field
from typing import List, Optional

class ProviderInput(BaseModel):
    id: str
    name: str
    description: str
    location: str
    services_offered: List[str] = Field(..., alias="servicesOffered")
    rating: float
    price_level: Optional[str] = Field(None, alias="priceLevel")

    model_config = {
        "populate_by_name": True
    }

class RecommendationRequest(BaseModel):
    query: str = Field(..., min_length=3, description="User requirement text")
    providers: List[ProviderInput] = Field(..., min_length=1, description="List of providers")

class KeyDecisionFactor(BaseModel):
    factor: str
    score: float
    description: str

class RecommendationResponse(BaseModel):
    match_score: int = Field(..., ge=0, le=100, alias="matchScore")
    recommended_provider: ProviderInput = Field(..., alias="recommendedProvider")
    alternative_providers: List[ProviderInput] = Field(default_factory=list, alias="alternativeProviders")
    reasoning: List[str]
    key_decision_factors: List[KeyDecisionFactor] = Field(default_factory=list, alias="keyDecisionFactors")

    model_config = {
        "populate_by_name": True
    }