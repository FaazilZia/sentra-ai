from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.modules.incidents.service import IncidentService
import uuid


@celery_app.task(name="nemoguard.healthcheck")
def worker_healthcheck() -> str:
    return "ok"


@celery_app.task(name="nemoguard.perform_security_scan")
def perform_security_scan(user_id_str: str, tenant_id_str: str) -> dict:
    user_id = uuid.UUID(user_id_str)
    tenant_id = uuid.UUID(tenant_id_str)
    
    with SessionLocal() as db:
        incidents = IncidentService.trigger_scan(db, user_id=user_id, tenant_id=tenant_id)
        return {
            "status": "completed",
            "incidents_detected": len(incidents)
        }
