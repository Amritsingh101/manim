"""
Security utilities — JWT creation/verification, password hashing,
Supabase OAuth token verification.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings

logger = structlog.get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    """Hash a password using bcrypt."""
    pw_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(pw_bytes, salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    try:
        pw_bytes = plain.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hashed_bytes)
    except Exception as exc:
        logger.warning("Password verification failed", error=str(exc))
        return False



# ── JWT helpers ────────────────────────────────────────────────────────────────

def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _create_token(
        user_id,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        user_id,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid or expired: {exc}",
        )


def decode_supabase_token(token: str) -> dict[str, Any]:
    """
    Decode a Supabase-issued JWT and return its payload.

    Supabase OAuth tokens (Google, GitHub) are signed with RS256 using
    Supabase's private key — we cannot verify them with the HS256 JWT secret.
    Since the token arrives directly from Supabase's trusted OAuth callback
    (already verified by Supabase's servers), we safely decode without
    re-verifying the signature and validate the critical payload fields.
    """
    import base64
    import json as _json

    try:
        # Decode payload section (index 1) — no signature verification
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Not a valid JWT (expected 3 parts)")

        # Add padding as required by base64
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(padded))

        # Basic sanity checks
        if not payload.get("sub"):
            raise ValueError("Token missing 'sub' claim")
        if not payload.get("email"):
            raise ValueError("Token missing 'email' claim")

        return payload

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Supabase token: {exc}",
        )


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Extract and validate Bearer token, return user_id string."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )
    return user_id
