"""
Cloudinary service — upload videos and generate thumbnails.
"""

import structlog
import cloudinary
import cloudinary.uploader
import cloudinary.api

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Configure on module load
if settings.cloudinary_enabled:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_video(local_path: str, public_id: str) -> dict:
    """
    Upload a local MP4 file to Cloudinary.
    Returns a dict with: secure_url, public_id, thumbnail_url, duration, format.
    """
    if not settings.cloudinary_enabled:
        raise RuntimeError("Cloudinary is not configured")

    logger.info("Uploading video to Cloudinary", path=local_path, public_id=public_id)

    result = cloudinary.uploader.upload(
        local_path,
        public_id=f"manimai/videos/{public_id}",
        resource_type="video",
        overwrite=True,
        eager=[
            # Auto-generate thumbnail at 3 seconds
            {"width": 640, "height": 360, "crop": "fill", "start_offset": "3"},
        ],
        eager_async=False,
    )

    thumbnail_url = None
    if result.get("eager"):
        thumbnail_url = result["eager"][0].get("secure_url")

    logger.info(
        "Cloudinary upload complete",
        url=result.get("secure_url"),
        public_id=result.get("public_id"),
    )

    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
        "thumbnail_url": thumbnail_url,
        "duration": result.get("duration"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
    }


def delete_video(public_id: str) -> None:
    """Delete a video from Cloudinary by its public_id."""
    if not settings.cloudinary_enabled:
        return
    try:
        cloudinary.uploader.destroy(public_id, resource_type="video")
        logger.info("Cloudinary video deleted", public_id=public_id)
    except Exception as exc:
        logger.warning("Failed to delete Cloudinary video", public_id=public_id, error=str(exc))
