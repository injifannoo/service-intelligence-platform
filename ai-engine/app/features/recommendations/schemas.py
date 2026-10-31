from typing import List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ProviderInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    description: str = ""
    location: Optional[str] = None
    services_offered: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("services_offered", "servicesOffered"),
        serialization_alias="servicesOffered",
    )
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    price_level: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("price_level", "priceLevel"),
        serialization_alias="priceLevel",
    )


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(
        ...,
        min_length=3,
        validation_alias=AliasChoices("query", "requirement"),
        description="User requirement or search query text",
    )
    providers: List[ProviderInput] = Field(
        ...,
        min_length=1,
        description="Candidate service providers for ranking and matching",
    )

    @property
    def requirement(self) -> str:
        """Backwards-compatible accessor for existing services referencing requirement."""
        return self.query


class KeyDecisionFactor(BaseModel):
    factor: str
    score: float = Field(..., ge=0.0, le=1.0)
    description: str


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    match_score: int = Field(
        ...,
        ge=0,
        le=100,
        validation_alias=AliasChoices("match_score", "matchScore"),
        serialization_alias="matchScore",
    )
    recommended_provider: Optional[ProviderInput] = Field(
        default=None,
        validation_alias=AliasChoices("recommended_provider", "recommendedProvider"),
        serialization_alias="recommendedProvider",
    )
    alternative_providers: List[ProviderInput] = Field(
        default_factory=list,
        validation_alias=AliasChoices("alternative_providers", "alternativeProviders"),
        serialization_alias="alternativeProviders",
    )
    reasoning: List[str] = Field(default_factory=list)
    key_decision_factors: List[KeyDecisionFactor] = Field(
        default_factory=list,
        validation_alias=AliasChoices("key_decision_factors", "keyDecisionFactors"),
        serialization_alias="keyDecisionFactors",
    )