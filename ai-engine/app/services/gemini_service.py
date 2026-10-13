import google.generativeai as genai
from app.core.config import settings
from app.core.exceptions import GeminiAPIException
from app.core.logging import logger

def query_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise GeminiAPIException("GEMINI_API_KEY is not configured.")

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise GeminiAPIException(str(e))