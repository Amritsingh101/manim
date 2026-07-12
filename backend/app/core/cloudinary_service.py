"""
Cloudinary service — upload videos and generate thumbnails.
"""

import structlog
import cloudinary
import cloudinary.uploader
import cloudinary.api
import cloudinary.utils

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


def _make_thumbnail_url(public_id: str) -> str:
    """
    Derive a thumbnail URL from a Cloudinary video public_id.

    Cloudinary can serve a video frame as an image by:
      - Changing resource_type from 'video' to 'image' in the URL path
      - Using the .jpg extension
      - Adding a so_ (start_offset) transformation to pick a specific frame

    This produces a signed-free, on-the-fly transformation URL.
    """
    # Build URL: image delivery of a video-derived thumbnail at 3 seconds
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type="video",
        format="jpg",
        transformation=[
            {"width": 640, "height": 360, "crop": "fill", "start_offset": "3"},
        ],
        secure=True,
    )
    return url


def upload_video(local_path: str, public_id: str) -> dict:
    """
    Upload a local MP4 file to Cloudinary.
    Returns a dict with: secure_url, public_id, thumbnail_url, duration, format.
    """
    if not settings.cloudinary_enabled:
        raise RuntimeError("Cloudinary is not configured")

    logger.info("Uploading video to Cloudinary", path=local_path, public_id=public_id)

    full_public_id = f"manimai/videos/{public_id}"

    result = cloudinary.uploader.upload(
        local_path,
        public_id=full_public_id,
        resource_type="video",
        overwrite=True,
        # Eager: generate a JPEG thumbnail synchronously during upload.
        # format="jpg" makes Cloudinary produce an image asset, not a video clip.
        eager=[
            {
                "width": 640,
                "height": 360,
                "crop": "fill",
                "start_offset": "3",
                "format": "jpg",
            },
        ],
        eager_async=False,
    )

    # Prefer the eager-derived URL; fall back to deriving it from public_id
    thumbnail_url = None
    if result.get("eager"):
        thumbnail_url = result["eager"][0].get("secure_url")

    # If eager didn't produce a thumbnail URL, derive it ourselves
    if not thumbnail_url:
        thumbnail_url = _make_thumbnail_url(full_public_id)

    logger.info(
        "Cloudinary upload complete",
        url=result.get("secure_url"),
        public_id=result.get("public_id"),
        thumbnail_url=thumbnail_url,
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
