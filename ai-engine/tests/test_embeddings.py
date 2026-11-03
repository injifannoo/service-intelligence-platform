import math
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AIServiceException
from app.features.embeddings.service import cosine_similarity
from app.main import app

client = TestClient(app)

SAMPLE_EMBEDDING_1 = [1.0, 0.0, 0.0]
SAMPLE_EMBEDDING_2 = [0.0, 1.0, 0.0]
SAMPLE_EMBEDDING_PARALLEL = [2.0, 0.0, 0.0]


# --- Unit Tests: Math & Similarity ---

def test_cosine_similarity_identical_direction():
    score = cosine_similarity(SAMPLE_EMBEDDING_1, SAMPLE_EMBEDDING_PARALLEL)
    assert math.isclose(score, 1.0, rel_tol=1e-5)


def test_cosine_similarity_orthogonal():
    score = cosine_similarity(SAMPLE_EMBEDDING_1, SAMPLE_EMBEDDING_2)
    assert math.isclose(score, 0.0, rel_tol=1e-5)


def test_cosine_similarity_dimension_mismatch_raises_error():
    with pytest.raises(AIServiceException):
        cosine_similarity([1.0, 0.0], [1.0, 0.0, 0.0])


# --- API Endpoint Integration Tests ---

@patch("app.features.embeddings.service.generate_text_embedding")
def test_generate_single_embedding_success(mock_embed):
    mock_embed.return_value = [0.1, 0.2, 0.3, 0.4]

    response = client.post(
        "/api/v1/embeddings/generate",
        json={"text": "Cloud security architecture", "taskType": "SEMANTIC_SIMILARITY"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["dimension"] == 4
    assert data["embedding"] == [0.1, 0.2, 0.3, 0.4]


def test_generate_single_embedding_validation_error():
    """Empty text must trigger HTTP 422 Unprocessable Entity."""
    response = client.post(
        "/api/v1/embeddings/generate",
        json={"text": ""},
    )
    assert response.status_code == 422


@patch("app.features.embeddings.service.generate_batch_embeddings")
def test_generate_batch_embeddings_success(mock_batch_embed):
    mock_batch_embed.return_value = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
    ]

    response = client.post(
        "/api/v1/embeddings/batch",
        json={"texts": ["Text 1", "Text 2"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert data["dimension"] == 3
    assert len(data["embeddings"]) == 2


def test_vector_similarity_ranking_success():
    payload = {
        "queryVector": [1.0, 0.0, 0.0],
        "candidates": [
            {"id": "candidate-orthogonal", "vector": [0.0, 1.0, 0.0]},
            {"id": "candidate-perfect", "vector": [1.0, 0.0, 0.0]},
            {"id": "candidate-close", "vector": [0.9, 0.1, 0.0]},
        ],
        "topK": 2,
    }

    response = client.post("/api/v1/embeddings/similarity", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["totalEvaluated"] == 3
    assert len(data["results"]) == 2
    assert data["results"][0]["id"] == "candidate-perfect"
    assert math.isclose(data["results"][0]["similarityScore"], 1.0, rel_tol=1e-5)
    assert data["results"][1]["id"] == "candidate-close"


def test_vector_similarity_dimension_mismatch_error():
    """Mismatched vector lengths between query and candidates return HTTP 400."""
    payload = {
        "queryVector": [1.0, 0.0],
        "candidates": [
            {"id": "candidate-1", "vector": [1.0, 0.0, 0.0]},
        ],
    }

    response = client.post("/api/v1/embeddings/similarity", json=payload)
    assert response.status_code == 400