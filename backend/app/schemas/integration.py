from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AgentSummary(BaseModel):
    id: UUID
    name: str
    tenant_id: UUID


class IdentitySummary(BaseModel):
    id: UUID
    type: str
    external_id: str


class AssetSummary(BaseModel):
    id: UUID
    name: str
    type: str
    tenant_id: UUID


class AssetClassificationSummary(BaseModel):
    classification_id: UUID
    label: str
    confidence: float | None = None


class AccessRequestContext(BaseModel):
    tenant_id: UUID
    agent_id: UUID
    actor_id: UUID
    actor_type: str
    asset_id: UUID
    requested_action: str
    purpose: str | None = None


class AuditEventCreate(BaseModel):
    tenant_id: UUID
    actor_id: UUID | None = None
    actor_type: str
    event_type: str
    resource_type: str
    resource_id: UUID | None = None
    payload: dict[str, Any] = {}
