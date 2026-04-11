from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
import uuid

from app.core.dependencies import DbSession, get_current_tenant, get_current_user
from app.models.incident import Incident
from app.models.tenant import Tenant
from pydantic import BaseModel
from celery.result import AsyncResult
from app.workers.celery_app import celery_app
from app.modules.policies.service import PolicyService
from app.schemas.policy import PolicyCreate, PolicyDocument, PolicyScope, PolicyConditions, PolicyUpdate
from app.models.enums import PolicyEffect

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
    status_filter: str | None = None,
) -> dict:
    from sqlalchemy import select, desc
    
    query = select(Incident).where(Incident.tenant_id == tenant.id)
    
    if status_filter:
        query = query.where(Incident.status == status_filter)
        
    query = query.order_by(desc(Incident.created_at)).limit(limit)
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
                "status": inc.status,
                "prompt_excerpt": inc.prompt_excerpt,
                "response_excerpt": inc.response_excerpt,
                "metadata": inc.event_metadata,
                "created_at": inc.created_at.isoformat()
            }
            for inc in incidents
        ],
        "total": len(incidents)
    }

class IncidentUpdate(BaseModel):
    status: str

@router.patch("/{incident_id}", status_code=status.HTTP_200_OK)
def update_incident_status(
    incident_id: UUID,
    incident_in: IncidentUpdate,
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
) -> dict:
    from sqlalchemy import select
    
    query = select(Incident).where(Incident.id == incident_id, Incident.tenant_id == tenant.id)
    incident = db.scalar(query)
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.status = incident_in.status
    
    # NEW: Trigger policy enforcement if blocked
    if incident.status == "blocked":
        policy_service = PolicyService(db)
        if incident.policy_id:
            # Disable the existing policy that caused the violation
            policy_service.disable_and_publish_policy(tenant.id, incident.policy_id)
        else:
            # Fallback: Create a new Deny-All policy for this agent
            new_policy_in = PolicyCreate(
                tenant_id=tenant.id,
                name=f"Auto-Block: {incident.agent_id}",
                description=f"Automated restriction created after blocking incident {incident_id}.",
                enabled=True,
                priority=10, # High priority
                effect=PolicyEffect.deny,
                document=PolicyDocument(
                    scope=PolicyScope(agents=[incident.agent_id]),
                    conditions=PolicyConditions(match_all=True),
                    obligations=[]
                )
            )
            created_policy = policy_service.create_policy(new_policy_in)
            policy_service.publish_policy(tenant.id, created_policy.id)
            # Link it for future reference
            incident.policy_id = created_policy.id

    db.commit()
    db.refresh(incident)
    
    return {
        "status": "ok", 
        "incident_id": str(incident.id), 
        "new_status": incident.status,
        "policy_enforced": True if incident.status == "blocked" else False
    }

@router.post("/scan", status_code=status.HTTP_201_CREATED)
def trigger_deep_scan(
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """
    Triggers the Deep Scan as a background task.
    """
    from app.workers.tasks import perform_security_scan
    
    user_id = current_user.id if hasattr(current_user, 'id') else uuid.UUID(current_user['id'])
    
    task = perform_security_scan.delay(str(user_id), str(tenant.id))
    
    return {
        "status": "pending",
        "message": "Deep Scan triggered in background.",
        "task_id": task.id
    }

@router.get("/scan/{task_id}", status_code=status.HTTP_200_OK)
def get_scan_status(task_id: str) -> dict:
    """
    Checks the status of a Deep Scan task.
    """
    res = AsyncResult(task_id, app=celery_app)
    
    data = {
        "task_id": task_id,
        "status": res.status, # PENDING, STARTED, SUCCESS, FAILURE
    }
    
    if res.ready():
        data["result"] = res.result
        
    return data
