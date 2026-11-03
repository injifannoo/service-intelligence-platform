import math
from typing import List

from app.core.exceptions import AIServiceException
from app.core.gemini_service import generate_batch_embeddings, generate_text_embedding
from app.core.logging import logger
from app.features.embeddings.schemas import (
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    EmbeddingResponse,
    ScoredVectorItem,
    TextEmbeddingRequest,
    VectorSimilarityRequest,
    VectorSimilarityResponse,
)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculates cosine similarity between two numeric vectors."""
    if len(vec_a) != len(vec_b):
        raise AIServiceException("Vector dimensions must match for similarity calculation.")

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(-1.0, min(1.0, dot_product / (norm_a * norm_b)))


def compute_text_embedding(payload: TextEmbeddingRequest) -> EmbeddingResponse:
    """Computes a single text vector embedding."""
    vector = generate_text_embedding(
        text=payload.text,
        task_type=payload.task_type or "SEMANTIC_SIMILARITY",
    )
    return EmbeddingResponse(embedding=vector, dimension=len(vector))


def compute_batch_embeddings(payload: BatchEmbeddingRequest) -> BatchEmbeddingResponse:
    """Computes embeddings for a batch of text items."""
    vectors = generate_batch_embeddings(
        texts=payload.texts,
        task_type=payload.task_type or "SEMANTIC_SIMILARITY",
    )
    dimension = len(vectors[0]) if vectors else 0
    return BatchEmbeddingResponse(
        embeddings=vectors,
        dimension=dimension,
        count=len(vectors),
    )


def rank_candidates_by_similarity(
    payload: VectorSimilarityRequest,
) -> VectorSimilarityResponse:
    """Ranks candidate vectors by cosine similarity against the query vector."""
    scored: List[ScoredVectorItem] = []

    for candidate in payload.candidates:
        score = cosine_similarity(payload.query_vector, candidate.vector)
        scored.append(ScoredVectorItem(id=candidate.id, similarity_score=score))

    # Sort descending by similarity score
    scored.sort(key=lambda item: item.similarity_score, reverse=True)

    return VectorSimilarityResponse(
        results=scored[: payload.top_k],
        total_evaluated=len(payload.candidates),
    )