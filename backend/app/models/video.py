"""Video model — tracks the full lifecycle of a generated video."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # User input
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    style: Mapped[str] = mapped_column(String(50), default="modern")
    quality: Mapped[str] = mapped_column(String(20), default="medium")

    # Pipeline outputs
    title: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    # Generated artifacts
    script: Mapped[dict | None] = mapped_column(JSONB)       # Stage 1 output
    manim_code: Mapped[str | None] = mapped_column(Text)     # Stage 2 output (final)

    # Status
    # pending | processing | completed | failed
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text)

    # Pipeline retry tracking
    compile_attempt: Mapped[int] = mapped_column(Integer, default=0)

    # Output
    video_url: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(300))
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="videos")  # noqa: F821
    jobs: Mapped[list["Job"]] = relationship(  # noqa: F821
        "Job", back_populates="video", cascade="all, delete-orphan", order_by="Job.created_at"
    )
