import os
import pytest
from fastapi.testclient import TestClient

# Inject safe test environment configuration prior to app imports
os.environ["GEMINI_API_KEY"] = "test-mock-api-key-12345"
os.environ["ENVIRONMENT"] = "testing"
os.environ["GEMINI_MODEL_NAME"] = "gemini-2.5-flash"

from app.main import app


@pytest.fixture
def client():
    """Provides a FastAPI TestClient configured for the test environment."""
    return TestClient(app)