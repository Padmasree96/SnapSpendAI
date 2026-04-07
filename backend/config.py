import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Security ──
    SECRET_KEY: str = "snapspend-ai-secret-key-2026"
    JWT_SECRET_KEY: str = "snapspend-jwt-secret-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Database ──
    DATABASE_URL: str = f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'snapspend.db')}"

    # ── File Uploads ──
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ── AI / OpenAI ──
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_TIMEOUT_SECONDS: int = 45

    # ── AI / Gemini ──
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_VISION_MODEL: str = "gemini-2.0-flash"

    # ── RAG / FAISS ──
    FAISS_INDEX_PATH: str = "faiss_index"
    RAG_CHUNK_SIZE: int = 900
    RAG_CHUNK_OVERLAP: int = 120
    RAG_TOP_K: int = 4

    # ── OCR ──
    TESSERACT_PATH: str = ""  # e.g. C:\Program Files\Tesseract-OCR\tesseract.exe

    # ── Security & Rate Limiting ──
    RATE_LIMIT_PER_MINUTE: int = 60
    ENCRYPTION_KEY: str = "snapspend-encryption-key-2026"
    BACKEND_API_KEY: str = ""

    # ── SMTP (future email support) ──
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        extra = "allow"


settings = Settings()
