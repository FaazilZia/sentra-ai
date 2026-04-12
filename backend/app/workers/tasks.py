from app.workers.celery_app import celery_app


@celery_app.task(name="nemoguard.healthcheck")
def worker_healthcheck() -> str:
    return "ok"
