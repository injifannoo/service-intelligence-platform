from typing import List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class TextEmbeddingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str = Field(..., min_length=1, description="Single text string to generate embedding for")
    task_type: Optional[str] = Field(
        default="SEMANTIC_SIMILARITY",
        validation_alias=AliasChoices("task_type", "taskType"),
        serialization_alias="taskType",
        description="Gemini embedding task type",
    )


class BatchEmbeddingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    texts: List[str] = Field(..., min_length=1, description="List of text strings to embed")
    task_type: Optional[str] = Field(
        default="SEMANTIC_SIMILARITY",
        validation_alias=AliasChoices("task_type", "taskType"),
        serialization_alias="taskType",
        description="Gemini embedding task type",
    )


class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    embedding: List[float] = Field(..., description="Normalized float vector embedding")
    dimension: int = Field(..., description="Dimensionality of the vector")


class BatchEmbeddingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    embeddings: List[List[float]] = Field(..., description="List of float vector embeddings")
    dimension: int = Field(..., description="Dimensionality of the vectors")
    count: int = Field(..., description="Total vectors generated")


class VectorItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Item or provider identifier")
    vector: List[float] = Field(..., min_length=1, description="Target item vector embedding")


class VectorSimilarityRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query_vector: List[float] = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("query_vector", "queryVector"),
        serialization_alias="queryVector",
        description="Query vector to compare candidates against",
    )
    candidates: List[VectorItem] = Field(
        ...,
        min_length=1,
        description="Candidate items with pre-computed vectors",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        validation_alias=AliasChoices("top_k", "topK"),
        serialization_alias="topK",
        description="Maximum number of ranked results to return",
    )


class ScoredVectorItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Item identifier")
    similarity_score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        validation_alias=AliasChoices("similarity_score", "similarityScore"),
        serialization_alias="similarityScore",
        description="Cosine similarity score",
    )


class VectorSimilarityResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    results: List[ScoredVectorItem] = Field(
        default_factory=list,
        description="Ranked candidates ordered by descending similarity",
    )
    total_evaluated: int = Field(
        ...,
        validation_alias=AliasChoices("total_evaluated", "totalEvaluated"),
        serialization_alias="totalEvaluated",
        description="Number of candidate vectors evaluated",
    )