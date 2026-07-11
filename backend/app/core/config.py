"""
Core configuration — reads from environment variables / .env file.
All settings validated by Pydantic at startup.
"""

import json
from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────────────
    APP_NAME: str = "ManimAI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # ── Security ───────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-to-a-long-random-secret-at-least-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database (Supabase Postgres) ───────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/manimdb"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/manimdb"

    # ── Redis (Upstash — use rediss:// for TLS) ────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ── Gemini LLMs ─────────────────────────────────────────────────────────────
    # Single API key for both models (same Google AI account)
    GEMINI_API_KEY: str = ""

    # Lighter model — fast, cheap, used for:
    #   Stage 1: Prompt detailing + script generation
    #   Stage 3: Code review + common mistake checking
    LIGHT_LLM_MODEL: str = "gemini-2.0-flash"
    LIGHT_LLM_TEMPERATURE: float = 0.4
    LIGHT_LLM_MAX_TOKENS: int = 8192

    # Heavier model — powerful, used for:
    #   Stage 2: Manim Python code generation
    #   Stage 4 recovery: Compilation error fixing
    HEAVY_LLM_MODEL: str = "gemini-2.5-pro"
    HEAVY_LLM_TEMPERATURE: float = 0.2
    HEAVY_LLM_MAX_TOKENS: int = 65536

    # ── Supabase (OAuth token verification) ───────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""  # Settings → API → Legacy JWT Secret

    # ── Cloudinary ─────────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(
            self.CLOUDINARY_CLOUD_NAME
            and self.CLOUDINARY_API_KEY
            and self.CLOUDINARY_API_SECRET
        )

    # ── Storage ────────────────────────────────────────────────────────────────
    MEDIA_DIR: str = "./media"
    MAX_VIDEO_SIZE_MB: int = 500

    # ── Rate Limiting ──────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 30

    # ── CORS ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] | str = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # ── Manim ─────────────────────────────────────────────────────────────────
    MANIM_TIMEOUT_SECONDS: int = 180  # 3 min — enough for low quality on Free Tier


    # ── Pipeline Smart Retry ───────────────────────────────────────────────────
    # Max compilation attempts before giving up
    MAX_COMPILE_RETRIES: int = 3
    # Max times to re-run full pipeline (Celery-level)
    MAX_PIPELINE_RETRIES: int = 2

    # ── LLM Request Timeout ────────────────────────────────────────────────────
    LLM_TIMEOUT_SECONDS: int = 180


settings = Settings()
