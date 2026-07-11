"""Videos API — create, list, get, delete."""

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.video import Video
from app.models.job import Job

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/videos")


class CreateVideoRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=2000)
    style: str = Field(default="modern", pattern=r"^(modern|minimal|colorful|dark|classic)$")
    quality: str = Field(default="medium", pattern=r"^(low|medium|high)$")
    duration_seconds: int = Field(default=60, ge=20, le=300)


class VideoResponse(BaseModel):
    id: str
    prompt: str
    style: str
    quality: str
    status: str
    title: str | None
    description: str | None
    duration_seconds: int | None
    video_url: str | None
    thumbnail_url: str | None
    error_message: str | None
    compile_attempt: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class JobResponse(BaseModel):
    id: str
    stage: str
    status: str
    progress: float
    message: str | None
    error: str | None
    attempt: int
    model_used: str | None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


@router.post("/", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def create_video(
    body: CreateVideoRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Create a new video generation job and enqueue it for processing."""
    video = Video(
        id=uuid.uuid4(),
        owner_id=uuid.UUID(current_user_id),
        prompt=body.prompt,
        style=body.style,
        quality=body.quality,
        status="pending",
    )
    db.add(video)
    await db.flush()
    video_id = str(video.id)

    import os
    from app.workers.render_worker import run_pipeline, run_pipeline_direct

    if os.environ.get("CELERY_ENABLED", "true").lower() == "false":
        # Run as a FastAPI background task — calls plain function, bypasses all Celery machinery
        background_tasks.add_task(
            run_pipeline_direct,
            video_id=video_id,
            prompt=body.prompt,
            style=body.style,
            duration_seconds=body.duration_seconds,
            quality=body.quality,
        )

    else:
        # Enqueue via Celery queue broker
        run_pipeline.apply_async(
            kwargs={
                "video_id": video_id,
                "prompt": body.prompt,
                "style": body.style,
                "duration_seconds": body.duration_seconds,
                "quality": body.quality,
            },
            countdown=1,  # 1 second delay to let DB commit propagate
        )



    logger.info("Video created and enqueued", video_id=video_id, prompt_preview=body.prompt[:60])
    return _video_to_response(video)


@router.get("/", response_model=list[VideoResponse])
async def list_videos(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """List all videos for the current user, newest first."""
    result = await db.execute(
        select(Video)
        .where(Video.owner_id == uuid.UUID(current_user_id))
        .order_by(desc(Video.created_at))
        .limit(min(limit, 100))
        .offset(offset)
    )
    videos = result.scalars().all()
    return [_video_to_response(v) for v in videos]


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Get a single video by ID."""
    video = await _get_video_or_404(db, video_id, current_user_id)
    return _video_to_response(video)


@router.get("/{video_id}/jobs", response_model=list[JobResponse])
async def get_video_jobs(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Get all pipeline job records for a video (for progress tracking)."""
    await _get_video_or_404(db, video_id, current_user_id)

    result = await db.execute(
        select(Job)
        .where(Job.video_id == uuid.UUID(video_id))
        .order_by(Job.created_at)
    )
    jobs = result.scalars().all()
    return [_job_to_response(j) for j in jobs]


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Delete a video and its Cloudinary asset."""
    video = await _get_video_or_404(db, video_id, current_user_id)

    # Delete from Cloudinary if stored there
    if video.cloudinary_public_id:
        from app.core.cloudinary_service import delete_video as cloudinary_delete
        cloudinary_delete(video.cloudinary_public_id)

    await db.delete(video)
    logger.info("Video deleted", video_id=video_id, user_id=current_user_id)


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_video_or_404(db: AsyncSession, video_id: str, user_id: str) -> Video:
    result = await db.execute(
        select(Video).where(
            Video.id == uuid.UUID(video_id),
            Video.owner_id == uuid.UUID(user_id),
        )
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


def _video_to_response(v: Video) -> VideoResponse:
    return VideoResponse(
        id=str(v.id),
        prompt=v.prompt,
        style=v.style,
        quality=v.quality,
        status=v.status,
        title=v.title,
        description=v.description,
        duration_seconds=v.duration_seconds,
        video_url=v.video_url,
        thumbnail_url=v.thumbnail_url,
        error_message=v.error_message,
        compile_attempt=v.compile_attempt,
        created_at=v.created_at,
        completed_at=v.completed_at,
    )


def _job_to_response(j: Job) -> JobResponse:
    return JobResponse(
        id=str(j.id),
        stage=j.stage,
        status=j.status,
        progress=j.progress,
        message=j.message,
        error=j.error,
        attempt=j.attempt,
        model_used=j.model_used,
        prompt_tokens=j.prompt_tokens,
        completion_tokens=j.completion_tokens,
        total_tokens=j.total_tokens,
        started_at=j.started_at,
        completed_at=j.completed_at,
    )
