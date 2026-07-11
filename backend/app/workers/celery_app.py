"""
ManimAI Celery application — configured for Upstash Redis (TLS) support.
"""

from celery import Celery

from app.core.config import settings


def create_celery_app() -> Celery:
    app = Celery(
        "manimai",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=["app.workers.render_worker"],
    )

    app.conf.update(
        # Serialization
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],

        # Timezone
        timezone="UTC",
        enable_utc=True,

        # Task behavior
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,  # One task at a time (rendering is heavy)

        # Result TTL — keep task results for 24h
        result_expires=86400,

        # Upstash Redis TLS support
        # rediss:// scheme requires ssl_cert_reqs='none' for Upstash
        broker_use_ssl=(
            {"ssl_cert_reqs": "none"}
            if settings.CELERY_BROKER_URL.startswith("rediss://")
            else None
        ),
        redis_backend_use_ssl=(
            {"ssl_cert_reqs": "none"}
            if settings.CELERY_RESULT_BACKEND.startswith("rediss://")
            else None
        ),
    )

    return app


celery_app = create_celery_app()
