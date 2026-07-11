"""
ManimAI v2 — FastAPI Application Entry Point
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1 import auth, health, users, videos
from app.core.config import settings
from app.core.logging import configure_logging

logger = structlog.get_logger(__name__)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    config_filename="",  # prevent slowapi from reading .env (Windows fix)
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    configure_logging(settings.DEBUG)
    logger.info("ManimAI v2 starting", version=settings.APP_VERSION)
    yield
    logger.info("ManimAI v2 shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered Manim animation generation — built with Gemini & FastAPI",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware ──────────────────────────────────────────────────────────────
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Rate limiting ───────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

    # ── Routers ─────────────────────────────────────────────────────────────────
    prefix = "/api/v1"
    app.include_router(health.router, prefix=prefix, tags=["Health"])
    app.include_router(auth.router, prefix=prefix, tags=["Auth"])
    app.include_router(users.router, prefix=prefix, tags=["Users"])
    app.include_router(videos.router, prefix=prefix, tags=["Videos"])

    # ── Static media ────────────────────────────────────────────────────────────
    os.makedirs(settings.MEDIA_DIR, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")

    # ── Global exception handler ────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exc_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception", path=str(request.url), error=str(exc))
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()
