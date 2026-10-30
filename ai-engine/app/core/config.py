from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ASIP AI Engine"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    GEMINI_API_KEY: str
    GEMINI_MODEL_NAME: str = "gemini-2.5-flash"
    GEMINI_REQUEST_TIMEOUT_SECONDS: float = 30.0
    GEMINI_MAX_RETRIES: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("GEMINI_API_KEY")
    @classmethod
    def validate_api_key(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError(
                "GEMINI_API_KEY environment variable is missing or empty. "
                "Please configure a valid key in your environment or .env file."
            )
        return value.strip()


settings = Settings()