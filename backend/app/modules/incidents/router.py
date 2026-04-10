from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
import uuid

from app.core.dependencies import DbSession, get_current_tenant
from app.models.incident import Incident
from app.models.tenant import Tenant
from pydantic import BaseModel

router = APIRouter(prefix="/incidents", tags=["Incidents"])

class IncidentCreate(BaseModel):
    agent_id: str
    action: str
    severity: int = 0
    policy_id: str | None = None
    details: str = ""
    prompt_excerpt: str = ""
    response_excerpt: str = ""
    metadata: dict = {}

@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_incident(
    incident_in: IncidentCreate,
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
) -> dict:
    # Convert policy_id to UUID if provided
    pid = None
    if incident_in.policy_id:
        try:
            pid = uuid.UUID(incident_in.policy_id)
        except ValueError:
            pid = None

    incident = Incident(
        tenant_id=tenant.id,
        agent_id=incident_in.agent_id,
        policy_id=pid,
        severity=incident_in.severity,
        action=incident_in.action,
        details=incident_in.details,
        prompt_excerpt=incident_in.prompt_excerpt,
        response_excerpt=incident_in.response_excerpt,
        event_metadata=incident_in.metadata,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return {"status": "ok", "id": str(incident.id)}

@router.get("/", status_code=status.HTTP_200_OK)
def list_incidents(
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    limit: int = 50,
) -> dict:
    from sqlalchemy import select, desc
    
    query = select(Incident).where(Incident.tenant_id == tenant.id).order_by(desc(Incident.created_at)).limit(limit)
    incidents = db.scalars(query).all()
    
    return {
        "items": [
            {
                "id": str(inc.id),
                "agent_id": inc.agent_id,
                "policy_id": str(inc.policy_id) if inc.policy_id else None,
                "severity": inc.severity,
                "action": inc.action,
                "details": inc.details,
                "prompt_excerpt": inc.prompt_excerpt,
                "response_excerpt": inc.response_excerpt,
                "metadata": inc.event_metadata,
                "created_at": inc.created_at.isoformat()
            }
            for inc in incidents
        ],
        "total": len(incidents)
    }
