"""Users API — get current user profile, update, delete."""

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/users")


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str | None
    avatar_url: str | None
    is_verified: bool
    oauth_provider: str | None
    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    username: str | None = Field(default=None, min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_]+$")


@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Get the authenticated user's profile."""
    user = await _get_user(db, current_user_id)
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_verified=user.is_verified,
        oauth_provider=user.oauth_provider,
    )


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Update profile fields."""
    user = await _get_user(db, current_user_id)

    if body.username and body.username != user.username:
        exists = (await db.execute(
            select(User).where(User.username == body.username)
        )).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = body.username

    if body.full_name is not None:
        user.full_name = body.full_name

    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_verified=user.is_verified,
        oauth_provider=user.oauth_provider,
    )


async def _get_user(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
