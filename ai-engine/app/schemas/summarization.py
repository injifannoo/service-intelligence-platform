from enum import Enum
from typing import List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ConsensusLabel(str, Enum):
    OVERWHELMINGLY_POSITIVE = "Overwhelmingly Positive"
    MOSTLY_POSITIVE = "Mostly Positive"
    MIXED = "Mixed"
    NEEDS_IMPROVEMENT = "Needs Improvement"


class SummarizationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider_name: str = Field(
        ...,
        min_length=2,
        validation_alias=AliasChoices("provider_name", "providerName"),
        serialization_alias="providerName",
        description="Name of the service provider being evaluated",
    )
    reviews: List[str] = Field(
        ...,
        min_length=1,
        description="List of raw customer review texts to synthesize",
    )
    provider_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("provider_id", "providerId"),
        serialization_alias="providerId",
        description="Optional provider identifier context",
    )


class SummarizationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider_name: str = Field(
        ...,
        validation_alias=AliasChoices("provider_name", "providerName"),
        serialization_alias="providerName",
        description="Name of the evaluated provider",
    )
    summary: str = Field(
        ...,
        description="Executive summary synthesizing overall provider reputation",
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Key strengths identified across reviews",
    )
    weaknesses: List[str] = Field(
        default_factory=list,
        description="Key drawbacks or areas for improvement identified across reviews",
    )
    overall_consensus: ConsensusLabel = Field(
        ...,
        validation_alias=AliasChoices("overall_consensus", "overallConsensus"),
        serialization_alias="overallConsensus",
        description="Reputational consensus: Overwhelmingly Positive, Mostly Positive, Mixed, or Needs Improvement",
    )