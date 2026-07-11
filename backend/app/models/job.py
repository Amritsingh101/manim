"""
Job model — one record per pipeline stage per video.

Stages:
  script       → Stage 1: Prompt detailing + script (Lighter LLM)
  code_gen     → Stage 2: Manim code generation (Heavier LLM)
  code_review  → Stage 3: Code review + common mistake fix (Lighter LLM)
  compilation  → Stage 4: Manim subprocess render
  upload       → Upload to Cloudinary
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

# Valid pipeline stages (ordered)
PIPELINE_STAGES = [
    "script",        # Stage 1
    "code_gen",      # Stage 2
    "code_review",   # Stage 3
    "compilation",   # Stage 4
    "upload",        # Final
]

# Valid statuses
JOB_STATUSES = ["pending", "running", "success", "failed", "retrying", "skipped"]


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True
    )

    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)

    # Retry tracking for this stage
    attempt: Mapped[int] = mapped_column(Integer, default=1)

    # Token usage (for billing / analytics)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    video: Mapped["Video"] = relationship("Video", back_populates="jobs")  # noqa: F821
