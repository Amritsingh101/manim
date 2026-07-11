"""
Smart Retry Render Pipeline — Celery task orchestrating all 4 stages.

Pipeline stages:
  Stage 1: Prompt Detailing + Script Generation  [Lighter LLM]
  Stage 2: Manim Code Generation                 [Heavier LLM]
  Stage 3: Code Review + Common Mistake Fix      [Lighter LLM]
  Stage 4: Manim Compilation + Render

Smart Retry Logic:
  When Stage 4 (compilation) fails, the error is classified:
    - SYNTAX  → fix at Stage 3 (re-run review_agent)
    - API     → fix at error_fix_agent → re-run from Stage 3
    - LOGIC   → regenerate from Stage 2 (re-run manim_agent)
    - TIMEOUT → regenerate from Stage 2 with simpler hint
    - UNKNOWN → attempt error_fix_agent → re-run from Stage 3

  Max compile retries: settings.MAX_COMPILE_RETRIES (default 3)
  Each retry resumes from the appropriate stage, not from Stage 1.
"""

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

import structlog
from celery.exceptions import Retry
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.agents.error_fix_agent import (
    ERROR_TYPE_LOGIC,
    ERROR_TYPE_TIMEOUT,
    classify_error,
    run_error_fix_agent,
)
from app.agents.manim_agent import run_manim_agent
from app.agents.prompt_agent import run_prompt_agent
from app.agents.review_agent import run_review_agent
from app.core.cloudinary_service import upload_video as cloudinary_upload
from app.core.config import settings
from app.models import ApiUsage, Job, User, Video  # noqa: F401 — register all models
from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)

# ── Sync DB for Celery workers ─────────────────────────────────────────────────
_sync_engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
_SyncSession = sessionmaker(bind=_sync_engine, autoflush=False)


def _db() -> Session:
    return _SyncSession()


def _run(coro):
    """Run an async coroutine synchronously inside a Celery task."""
    return asyncio.run(coro)


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _update_job(
    db: Session,
    video_id: str,
    stage: str,
    status: str,
    progress: float,
    message: str = "",
    error: str = "",
    attempt: int = 1,
    usage: dict | None = None,
) -> None:
    """Upsert a Job record for a pipeline stage."""
    now = datetime.now(timezone.utc)
    job = db.query(Job).filter(Job.video_id == video_id, Job.stage == stage).first()

    if not job:
        job = Job(
            id=uuid.uuid4(),
            video_id=uuid.UUID(video_id),
            stage=stage,
            status=status,
            progress=progress,
            message=message or None,
            error=error[:2000] if error else None,
            attempt=attempt,
            started_at=now if status == "running" else None,
            completed_at=now if status in ("success", "failed", "skipped") else None,
        )
        db.add(job)
    else:
        job.status = status
        job.progress = progress
        job.message = message or None
        job.error = error[:2000] if error else None
        job.attempt = attempt
        if status == "running" and not job.started_at:
            job.started_at = now
        if status in ("success", "failed", "skipped"):
            job.completed_at = now

    # Attach token usage if provided
    if usage:
        job.prompt_tokens = usage.get("prompt_tokens", 0)
        job.completion_tokens = usage.get("completion_tokens", 0)
        job.total_tokens = usage.get("total_tokens", 0)
        job.model_used = usage.get("model", "")

    db.commit()


def _update_video(db: Session, video_id: str, **kwargs) -> None:
    """Update Video record fields."""
    db.query(Video).filter(Video.id == video_id).update(kwargs)
    db.commit()


def _record_api_usage(
    db: Session,
    video_id: str,
    stage: str,
    usage: dict,
) -> None:
    """Persist LLM token usage to api_usages table."""
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return
        record = ApiUsage(
            id=uuid.uuid4(),
            user_id=video.owner_id,
            video_id=uuid.UUID(video_id),
            stage=stage,
            model=usage.get("model", ""),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )
        db.add(record)
        db.commit()
    except Exception as exc:
        logger.warning("Failed to record API usage", stage=stage, error=str(exc))
        try:
            db.rollback()
        except Exception:
            pass


# ── Main Celery Task ───────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="app.workers.render_worker.run_pipeline",
    max_retries=settings.MAX_PIPELINE_RETRIES,
    default_retry_delay=20,
)
def run_pipeline(
    self,
    video_id: str,
    prompt: str,
    style: str,
    duration_seconds: int,
    quality: str,
) -> dict:
    """
    Orchestrates the full AI → Manim render pipeline with smart retry.

    Returns:
        {"success": True, "video_url": "..."} on success
        {"success": False, "error": "..."} on final failure
    """
    db = _db()
    celery_task_id = getattr(getattr(self, "request", None), "id", None)
    task_id = celery_task_id or f"bg-{uuid.uuid4().hex[:8]}"
    log = logger.bind(video_id=video_id, task_id=task_id)
    log.info("Pipeline starting", prompt_preview=prompt[:80])

    try:
        # Guard: abort if video was deleted before worker picked it up
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            log.warning("Video not found — stale task, aborting")
            return {"success": False, "error": "Video was deleted before processing"}

        _update_video(db, video_id, status="processing")

        # ──────────────────────────────────────────────────────────────────────
        # STAGE 1: Prompt Detailing + Script Generation  [Lighter LLM]
        # ──────────────────────────────────────────────────────────────────────
        log.info("Stage 1: Prompt detailing + script generation")
        _update_job(db, video_id, "script", "running", 10.0, "Detailing your prompt and writing script…")

        script, s1_usage = _run(
            run_prompt_agent(prompt, style, duration_seconds)
        )

        # Let LLM decide the optimal duration
        duration_seconds = script.get("duration_seconds", duration_seconds)
        duration_seconds = max(30, min(300, duration_seconds))

        _update_video(
            db, video_id,
            script=script,
            title=script.get("title", ""),
            description=script.get("description", ""),
            duration_seconds=duration_seconds,
        )
        _update_job(
            db, video_id, "script", "success", 100.0,
            f"Script ready — {len(script.get('scenes', []))} scenes, {duration_seconds}s",
            usage=s1_usage,
        )
        _record_api_usage(db, video_id, "script", s1_usage)
        log.info("Stage 1 complete", title=script.get("title"), duration=duration_seconds)

        # ──────────────────────────────────────────────────────────────────────
        # STAGES 2-4 with Smart Retry Loop
        # ──────────────────────────────────────────────────────────────────────
        manim_code: str | None = None
        last_compile_error: str | None = None
        error_type: str | None = None

        for compile_attempt in range(1, settings.MAX_COMPILE_RETRIES + 1):
            log.info("Compile attempt", attempt=compile_attempt, max=settings.MAX_COMPILE_RETRIES)

            # ── STAGE 2: Manim Code Generation  [Heavier LLM] ─────────────────
            # Run Stage 2 if: first attempt, or error_type indicates full regen
            need_regen = (
                manim_code is None
                or error_type in (ERROR_TYPE_LOGIC, ERROR_TYPE_TIMEOUT)
            )

            if need_regen:
                log.info("Stage 2: Manim code generation", compile_attempt=compile_attempt)
                _update_job(
                    db, video_id, "code_gen", "running", 10.0,
                    f"Generating Manim animation code… (attempt {compile_attempt})",
                    attempt=compile_attempt,
                )
                previous_error_hint = (
                    f"Previous attempt failed ({error_type}): {last_compile_error[:400]}"
                    if last_compile_error else None
                )
                manim_code, s2_usage = _run(
                    run_manim_agent(
                        prompt, script, style, duration_seconds,
                        previous_attempt_error=previous_error_hint,
                    )
                )
                _update_job(
                    db, video_id, "code_gen", "success", 100.0,
                    f"Code generated ({len(manim_code.splitlines())} lines)",
                    attempt=compile_attempt,
                    usage=s2_usage,
                )
                _record_api_usage(db, video_id, "code_gen", s2_usage)
                log.info("Stage 2 complete", lines=len(manim_code.splitlines()))

            else:
                # Apply error fix if we have a non-logic error from previous attempt
                if last_compile_error and compile_attempt > 1:
                    log.info("Stage 2b: Error fix (no full regen)", error_type=error_type)
                    _update_job(
                        db, video_id, "code_gen", "running", 50.0,
                        f"Fixing compilation error… (attempt {compile_attempt})",
                        attempt=compile_attempt,
                    )
                    manim_code, error_type_fix, fix_usage = _run(
                        run_error_fix_agent(manim_code, last_compile_error, prompt)
                    )
                    _update_job(
                        db, video_id, "code_gen", "success", 100.0,
                        "Error fix applied",
                        attempt=compile_attempt,
                        usage=fix_usage,
                    )
                    _record_api_usage(db, video_id, "code_gen", fix_usage)

            # ── STAGE 3: Code Review  [Lighter LLM] ───────────────────────────
            log.info("Stage 3: Code review", compile_attempt=compile_attempt)
            _update_job(
                db, video_id, "code_review", "running", 10.0,
                f"Reviewing and fixing code… (attempt {compile_attempt})",
                attempt=compile_attempt,
            )
            reviewed_code, issues, s3_usage = _run(
                run_review_agent(manim_code, prompt)
            )

            # If review detected truncation, force Stage 2 regen
            if any("truncated" in i.lower() for i in issues):
                log.warning("Truncated code detected — forcing Stage 2 regen", attempt=compile_attempt)
                error_type = ERROR_TYPE_LOGIC
                last_compile_error = "Code was truncated — LLM hit token limit"
                _update_job(
                    db, video_id, "code_review", "failed", 100.0,
                    "Code truncated, regenerating…",
                    error="Truncated output",
                    attempt=compile_attempt,
                )
                continue  # Next compile_attempt → Stage 2 regen

            _update_job(
                db, video_id, "code_review", "success", 100.0,
                f"Review complete — {len(issues)} issues fixed" if issues else "Code looks good",
                attempt=compile_attempt,
                usage=s3_usage,
            )
            if s3_usage.get("total_tokens", 0) > 0:
                _record_api_usage(db, video_id, "code_review", s3_usage)

            manim_code = reviewed_code
            log.info("Stage 3 complete", issues=len(issues))

            # ── STAGE 4: Compilation + Render ──────────────────────────────────
            log.info("Stage 4: Manim compilation", compile_attempt=compile_attempt)
            _update_video(db, video_id, manim_code=manim_code, compile_attempt=compile_attempt)
            _update_job(
                db, video_id, "compilation", "running", 5.0,
                f"Rendering animation… (attempt {compile_attempt})",
                attempt=compile_attempt,
            )

            render_result = _render_manim(video_id, manim_code, quality, log)

            if render_result["success"]:
                # ── SUCCESS ────────────────────────────────────────────────────
                video_path = render_result["path"]
                _update_job(
                    db, video_id, "compilation", "success", 100.0,
                    "Render complete!",
                    attempt=compile_attempt,
                )
                log.info("Render succeeded", path=video_path)

                # ── Upload to Cloudinary or serve locally ──────────────────────
                video_url, cloudinary_id, thumbnail_url = _handle_upload(
                    video_path, video_id, db, log
                )

                _update_video(
                    db, video_id,
                    status="completed",
                    video_url=video_url,
                    cloudinary_public_id=cloudinary_id,
                    thumbnail_url=thumbnail_url,
                    file_size_bytes=os.path.getsize(video_path) if os.path.exists(video_path) else 0,
                    completed_at=datetime.now(timezone.utc),
                )

                log.info("Pipeline complete!", video_url=video_url, total_attempts=compile_attempt)
                return {"success": True, "video_url": video_url}

            else:
                # ── COMPILATION FAILED ─────────────────────────────────────────
                stderr = render_result.get("stderr", "")
                last_compile_error = stderr
                error_type = classify_error(stderr)

                log.warning(
                    "Compilation failed",
                    attempt=compile_attempt,
                    error_type=error_type,
                    stderr_preview=stderr[:300],
                )

                _update_job(
                    db, video_id, "compilation", "failed" if compile_attempt >= settings.MAX_COMPILE_RETRIES else "retrying",
                    100.0,
                    f"Compilation failed (attempt {compile_attempt}/{settings.MAX_COMPILE_RETRIES}) — {error_type} error",
                    error=stderr[:1500],
                    attempt=compile_attempt,
                )

                if compile_attempt >= settings.MAX_COMPILE_RETRIES:
                    # All attempts exhausted
                    break
                # else: loop continues with next attempt, smart retry determines stage

        # ── All retries exhausted ──────────────────────────────────────────────
        error_msg = f"Compilation failed after {settings.MAX_COMPILE_RETRIES} attempts. Last error: {(last_compile_error or '')[:300]}"
        _update_video(db, video_id, status="failed", error_message=error_msg)
        log.error("Pipeline failed — all retries exhausted", error_type=error_type)
        return {"success": False, "error": error_msg}

    except Exception as exc:
        log.error("Pipeline unexpected error", error=str(exc), exc_info=True)
        retry_count = self.request.retries if (self and hasattr(self, "request")) else 0
        max_retries = self.max_retries if (self and hasattr(self, "max_retries")) else 0
        retries_left = max_retries - retry_count

        try:
            db.rollback()
            if retries_left > 0:
                _update_video(db, video_id, status="processing")
                for job in db.query(Job).filter(Job.video_id == video_id).all():
                    if job.status in ("failed", "running"):
                        job.status = "retrying"
                        job.message = f"Retrying pipeline (attempt {retry_count + 2}/{self.max_retries + 1})"
                        job.error = str(exc)[:500]
                db.commit()
            else:
                _update_video(
                    db, video_id,
                    status="failed",
                    error_message=f"Pipeline error: {str(exc)[:500]}",
                )
        except Exception as db_exc:
            log.error("Failed to update status after error", error=str(db_exc))

        if self and hasattr(self, "request") and hasattr(self, "retry"):
            try:
                raise self.retry(exc=exc, countdown=30 * (retry_count + 1))
            except Retry:
                raise
        else:
            raise exc
    finally:
        db.close()


# ── Direct (non-Celery) entrypoint for FastAPI BackgroundTasks ─────────────────
def run_pipeline_direct(
    video_id: str,
    prompt: str,
    style: str,
    duration_seconds: int,
    quality: str,
) -> dict:
    """Plain Python wrapper — no Celery dispatch. Used when CELERY_ENABLED=false."""
    return run_pipeline.run(
        video_id=video_id,
        prompt=prompt,
        style=style,
        duration_seconds=duration_seconds,
        quality=quality,
    )


# ── Render subprocess ──────────────────────────────────────────────────────────

def _render_manim(video_id: str, code: str, quality: str, log) -> dict:
    """
    Write Manim code to a temp file and invoke manim render.
    Returns {"success": True, "path": "..."} or {"success": False, "stderr": "..."}.
    """
    # On the Render Free Tier (0.1 vCPU, 512 MB RAM) cap to low quality for speed.
    # Low quality = 480p @ 15fps — renders ~3x faster than medium on shared CPU.
    free_tier = os.environ.get("CELERY_ENABLED", "true").lower() == "false"
    if free_tier:
        quality = "low"

    quality_map = {
        "low":    "-ql",
        "medium": "-qm",
        "high":   "-qh",
    }
    quality_flag = quality_map.get(quality, "-ql")
    media_dir = Path(settings.MEDIA_DIR)
    media_dir.mkdir(parents=True, exist_ok=True)

    # Find manim binary in the venv
    venv_scripts = Path(sys.executable).parent
    manim_bin = venv_scripts / ("manim.exe" if os.name == "nt" else "manim")
    if not manim_bin.exists():
        manim_bin = shutil.which("manim") or "manim"

    with tempfile.TemporaryDirectory(prefix="manimai_") as tmpdir:
        scene_file = Path(tmpdir) / "scene.py"
        scene_file.write_text(code, encoding="utf-8")

        cmd = [
            str(manim_bin), "render",
            str(scene_file),
            "MainScene",
            quality_flag,
            "--output_file", video_id,
            "--media_dir", tmpdir,
            "--disable_caching",
        ]

        log.info("Running manim", cmd=" ".join(str(c) for c in cmd))

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.MANIM_TIMEOUT_SECONDS,
                cwd=tmpdir,
            )
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stderr": f"Manim process timed out after {settings.MANIM_TIMEOUT_SECONDS}s",
            }

        if result.returncode != 0:
            stderr = result.stderr + "\n" + result.stdout
            log.warning("Manim render failed", returncode=result.returncode, stderr_preview=stderr[:400])
            return {"success": False, "stderr": stderr}

        # Find the produced MP4
        for root, _, files in os.walk(tmpdir):
            for fname in files:
                if fname.endswith(".mp4"):
                    src = Path(root) / fname
                    dst = media_dir / f"{video_id}.mp4"
                    shutil.move(str(src), str(dst))
                    log.info("MP4 moved to media dir", dst=str(dst))
                    return {"success": True, "path": str(dst)}

    return {"success": False, "stderr": "Manim exited 0 but no MP4 was produced"}


def _handle_upload(
    video_path: str,
    video_id: str,
    db: Session,
    log,
) -> tuple[str, str | None, str | None]:
    """
    Upload video to Cloudinary if configured, else return local URL.
    Returns (video_url, cloudinary_public_id, thumbnail_url).
    """
    if settings.cloudinary_enabled:
        try:
            result = cloudinary_upload(video_path, public_id=video_id)
            video_url = result["secure_url"]
            cloudinary_id = result["public_id"]
            thumbnail_url = result.get("thumbnail_url")
            # Remove local file after successful cloud upload
            try:
                os.remove(video_path)
            except OSError:
                pass
            log.info("Uploaded to Cloudinary", url=video_url)
            return video_url, cloudinary_id, thumbnail_url
        except Exception as exc:
            log.error("Cloudinary upload failed — falling back to local", error=str(exc))

    # Fallback: serve from local media dir
    video_url = f"/media/{os.path.basename(video_path)}"
    log.info("Serving video locally", url=video_url)
    return video_url, None, None
