"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "caseconnect"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # File storage
    upload_dir: str = "uploads"
    max_file_size_mb: int = 20

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vector_index_name: str = "caseconnect_vector_index"
    embedding_dimensions: int = 384

    # LLM
    llm_provider: str = "ollama"  # ollama | openai_compatible
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # OpenAI-compatible alternative
    llm_api_base: str = ""
    llm_api_key: str = ""
    llm_model: str = ""

    # RAG
    retrieval_top_k: int = 5
    chunk_size: int = 1000
    chunk_overlap: int = 150

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()

