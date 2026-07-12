"""
Backfill thumbnail_url for existing completed videos that have a cloudinary_public_id
but no thumbnail_url set.

Usage (from d:\\manim20\\backend):
    python -m app.scripts.backfill_thumbnails
"""

import cloudinary.utils
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
import cloudinary

if settings.cloudinary_enabled:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def make_thumbnail_url(public_id: str) -> str:
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


def main():
    engine = create_engine(settings.SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    rows = db.execute(
        text("""
            SELECT id, cloudinary_public_id
            FROM videos
            WHERE status = 'completed'
              AND cloudinary_public_id IS NOT NULL
              AND (thumbnail_url IS NULL OR thumbnail_url = '')
        """)
    ).fetchall()

    print(f"Found {len(rows)} videos missing thumbnail_url")

    for row in rows:
        vid_id, pub_id = row
        thumb = make_thumbnail_url(pub_id)
        db.execute(
            text("UPDATE videos SET thumbnail_url = :thumb WHERE id = :id"),
            {"thumb": thumb, "id": str(vid_id)},
        )
        print(f"  ✓ {vid_id} → {thumb}")

    db.commit()
    db.close()
    print("Done.")


if __name__ == "__main__":
    main()
