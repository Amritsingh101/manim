"""
Authentication routes — register, login, refresh, logout, OAuth sync.
"""

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_supabase_token,
    decode_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user with email + password."""
    # Check email uniqueness
    if (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    if (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        username=body.username,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        oauth_provider="email",
        # Email verification: set is_verified=False, user must confirm email
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    logger.info("User registered", user_id=str(user.id), email=user.email)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email + password."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    logger.info("User logged in", user_id=str(user.id))

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    """Exchange refresh token for new access + refresh tokens."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    return TokenResponse(
        access_token=create_access_token(payload["sub"]),
        refresh_token=create_refresh_token(payload["sub"]),
    )


@router.post("/logout", status_code=204)
async def logout(current_user_id: str = Depends(get_current_user_id)):
    """Invalidate session (stateless — client discards tokens)."""
    logger.info("User logged out", user_id=current_user_id)


# ── OAuth via Supabase ─────────────────────────────────────────────────────────

class OAuthSyncRequest(BaseModel):
    supabase_token: str


@router.post("/oauth-sync", response_model=TokenResponse)
async def oauth_sync(
    body: OAuthSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Supabase OAuth token (from Google/GitHub login) for ManimAI tokens.

    Flow:
    1. Frontend completes OAuth via Supabase Auth (Google / GitHub buttons)
    2. Frontend receives Supabase access_token in the callback
    3. Frontend POSTs that token here
    4. We verify it, upsert user in our Postgres, return our own JWT pair
    """
    supabase_payload = decode_supabase_token(body.supabase_token)

    supabase_uid: str = supabase_payload.get("sub", "")
    email: str = supabase_payload.get("email", "")
    user_meta: dict = supabase_payload.get("user_metadata", {})
    full_name: str = user_meta.get("full_name") or user_meta.get("name", "")
    avatar_url: str = user_meta.get("avatar_url") or user_meta.get("picture", "")
    provider: str = supabase_payload.get("app_metadata", {}).get("provider", "oauth")

    if not email:
        raise HTTPException(status_code=400, detail="OAuth provider did not return an email")

    # Upsert user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # First OAuth login — create account
        base_uname = email.split("@")[0].lower().replace(".", "_")[:40]
        uname = base_uname
        if (await db.execute(select(User).where(User.username == uname))).scalar_one_or_none():
            uname = f"{base_uname}_{supabase_uid[:6]}"

        user = User(
            id=uuid.uuid4(),
            email=email,
            username=uname,
            full_name=full_name or email.split("@")[0],
            avatar_url=avatar_url or None,
            hashed_password=hash_password(uuid.uuid4().hex),  # random unusable password
            oauth_provider=provider,
            is_verified=True,  # OAuth emails are pre-verified
        )
        db.add(user)
        try:
            await db.flush()
            logger.info("OAuth user created", user_id=str(user.id), provider=provider)
        except IntegrityError:
            # Race condition — another request already created this user
            await db.rollback()
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=500, detail="Failed to create user account")
    else:
        # Returning user — update avatar if missing
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        user.last_login_at = datetime.now(timezone.utc)
        logger.info("OAuth user logged in", user_id=str(user.id), provider=provider)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
