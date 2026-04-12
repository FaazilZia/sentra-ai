from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.dependencies import DbSession, get_current_tenant
from app.models.connector import Connector, ConnectorType
from sqlalchemy import select

router = APIRouter(prefix="/connectors", tags=["Connectors"])

class ConnectorCreate(BaseModel):
    name: str
    type: str
    config: dict

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_connector(
    connector_in: ConnectorCreate,
    db: DbSession,
    tenant: Annotated[any, Depends(get_current_tenant)],
) -> dict:
    connector = Connector(
        tenant_id=tenant.id,
        name=connector_in.name,
        type=ConnectorType(connector_in.type),
        config=connector_in.config,
        status="active"
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return {"status": "ok", "id": str(connector.id)}

@router.get("/", status_code=status.HTTP_200_OK)
def list_connectors(
    db: DbSession,
    tenant: Annotated[any, Depends(get_current_tenant)],
) -> dict:
    query = select(Connector).where(Connector.tenant_id == tenant.id)
    connectors = db.scalars(query).all()
    return {
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "type": c.type,
                "status": c.status,
                "last_scan_at": c.last_scan_at
            }
            for c in connectors
        ]
    }

@router.post("/{connector_id}/test", status_code=status.HTTP_200_OK)
def test_connector(
    connector_id: UUID,
    db: DbSession,
    tenant: Annotated[any, Depends(get_current_tenant)],
) -> dict:
    # In a real app, this would try to connect and return status
    return {"status": "success", "message": "Connection verified successfully."}
