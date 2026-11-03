from fastapi import APIRouter, HTTPException, status

from app.core.exceptions import AIServiceException
from app.features.embeddings.schemas import (
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    EmbeddingResponse,
    TextEmbeddingRequest,
    VectorSimilarityRequest,
    VectorSimilarityResponse,
)
from app.features.embeddings.service import (
    compute_batch_embeddings,
    compute_text_embedding,
    rank_candidates_by_similarity,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=EmbeddingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a single text embedding",
)
def generate_single_embedding(payload: TextEmbeddingRequest) -> EmbeddingResponse:
    try:
        return compute_text_embedding(payload)
    except AIServiceException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/batch",
    response_model=BatchEmbeddingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate batch text embeddings",
)
def generate_multiple_embeddings(payload: BatchEmbeddingRequest) -> BatchEmbeddingResponse:
    try:
        return compute_batch_embeddings(payload)
    except AIServiceException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/similarity",
    response_model=VectorSimilarityResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank candidate vectors by cosine similarity",
)
def compute_vector_similarity(payload: VectorSimilarityRequest) -> VectorSimilarityResponse:
    try:
        return rank_candidates_by_similarity(payload)
    except AIServiceException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )