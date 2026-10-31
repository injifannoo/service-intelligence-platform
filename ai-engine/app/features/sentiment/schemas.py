from enum import Enum
from typing import List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class SentimentLabel(str, Enum):
    POSITIVE = "Positive"
    NEGATIVE = "Negative"
    NEUTRAL = "Neutral"
    MIXED = "Mixed"


class SentimentAnalysisRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str = Field(
        ...,
        min_length=3,
        description="The customer review or feedback text to analyze",
    )
    provider_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("provider_id", "providerId"),
        serialization_alias="providerId",
        description="Optional provider identifier context",
    )


class SentimentAnalysisResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    sentiment: SentimentLabel = Field(
        ...,
        description="Sentiment classification: Positive, Negative, Neutral, or Mixed",
    )
    sentiment_score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        validation_alias=AliasChoices("sentiment_score", "sentimentScore"),
        serialization_alias="sentimentScore",
        description="Polarity score between -1.0 and 1.0",
    )
    positive_aspects: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("positive_aspects", "positiveAspects"),
        serialization_alias="positiveAspects",
        description="List of positive service aspects extracted from the review",
    )
    negative_aspects: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("negative_aspects", "negativeAspects"),
        serialization_alias="negativeAspects",
        description="List of negative service aspects extracted from the review",
    )