"""
Async SQLAlchemy database engine + session factory.
Uses asyncpg for high-performance async Postgres connections.

NOTE: asyncpg does NOT accept ?sslmode=require in the URL.
SSL is configured via connect_args={"ssl": True} instead.
"""

import re
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def _clean_asyncpg_url(url: str) -> tuple[str, dict]:
    """
    asyncpg doesn't accept ?sslmode=... query params — strip them and
    return connect_args with ssl='require' if sslmode was present.

    We use ssl='require' instead of ssl=True because Supabase's pooler
    (pgBouncer) uses a self-signed certificate that fails system CA
    verification. 'require' still encrypts the connection.
    """
    needs_ssl = "sslmode" in url
    # Remove sslmode param (handles ?sslmode=... and &sslmode=...)
    clean = re.sub(r"[?&]sslmode=[^&]*", "", url).rstrip("?").rstrip("&")
    # 'require' = encrypt but skip certificate verification
    connect_args = {"ssl": "require"} if needs_ssl else {}
    return clean, connect_args


_db_url, _connect_args = _clean_asyncpg_url(settings.DATABASE_URL)

# ── Async engine ───────────────────────────────────────────────────────────────
engine = create_async_engine(
    _db_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)


# ── Session factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
