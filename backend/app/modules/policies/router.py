from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_tenant, get_current_user
from app.models.tenant import Tenant
from app.models.user import User
from app.modules.policies.service import PolicyService
from app.schemas.policy import (
    PolicyCreate,
    PolicyCreateRequest,
    PolicyListResponse,
    PolicyPublishResponse,
    PolicyResponse,
    PolicyUpdate,
    PolicyVersionResponse,
)
from app.core.dependencies import DbSession

router = APIRouter(prefix="/policies")


@router.get("", response_model=PolicyListResponse)
def list_policies(
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> PolicyListResponse:
    items, total = PolicyService(db).list_policies(current_tenant.id)
    return PolicyListResponse(items=[PolicyResponse.model_validate(item) for item in items], total=total)


@router.post("", response_model=PolicyResponse)
def create_policy(
    payload: PolicyCreateRequest,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> PolicyResponse:
    create_payload = PolicyCreate(tenant_id=current_tenant.id, **payload.model_dump())
    policy = PolicyService(db).create_policy(create_payload)
    return PolicyResponse.model_validate(policy)


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: UUID,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> PolicyResponse:
    policy = PolicyService(db).get_policy(current_tenant.id, policy_id)
    return PolicyResponse.model_validate(policy)


@router.patch("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: UUID,
    payload: PolicyUpdate,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> PolicyResponse:
    policy = PolicyService(db).update_policy(current_tenant.id, policy_id, payload)
    return PolicyResponse.model_validate(policy)


@router.post("/{policy_id}/publish", response_model=PolicyPublishResponse)
def publish_policy(
    policy_id: UUID,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> PolicyPublishResponse:
    service = PolicyService(db)
    policy = service.publish_policy(current_tenant.id, policy_id)
    return PolicyPublishResponse(
        policy_id=policy.id,
        published_version=policy.published_version or policy.current_version,
        status=policy.status,
        published_at=service.published_at(policy),
    )


@router.get("/{policy_id}/versions", response_model=list[PolicyVersionResponse])
def list_policy_versions(
    policy_id: UUID,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> list[PolicyVersionResponse]:
    versions = PolicyService(db).list_versions(current_tenant.id, policy_id)
    return [PolicyVersionResponse.model_validate(item) for item in versions]
