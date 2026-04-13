from typing import List, Tuple
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import PolicyStatus
from app.models.policy import Policy
from app.models.policy_version import PolicyVersion
from app.modules.policies.repository import PolicyRepository
from app.modules.policies.validator import PolicyValidator
from app.schemas.policy import PolicyCreate, PolicyCreateRequest, PolicyDocument, PolicyUpdate


class PolicyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PolicyRepository(db)

    def list_policies(self, tenant_id: UUID) -> Tuple[List[Policy], int]:
        return self.repository.list_by_tenant(tenant_id)

    def get_policy(self, tenant_id: UUID, policy_id: UUID) -> Policy:
        policy = self.repository.get_policy_for_tenant(tenant_id, policy_id)
        if policy is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        return policy

    def create_policy(self, payload: PolicyCreate) -> Policy:
        PolicyValidator.validate_create(payload)
        policy = Policy(
            tenant_id=payload.tenant_id,
            name=payload.name,
            description=payload.description,
            enabled=payload.enabled,
            priority=payload.priority,
            effect=payload.effect,
            status=PolicyStatus.draft,
            current_version=1,
            published_version=None,
            scope=payload.document.scope.model_dump(mode="json"),
            conditions=payload.document.conditions.model_dump(by_alias=True, mode="json"),
            obligations=[item.model_dump(mode="json") for item in payload.document.obligations],
        )
        self.repository.add_policy(policy)
        self._create_version_snapshot(policy=policy, version_number=1, is_published_snapshot=False)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def update_policy(self, tenant_id: UUID, policy_id: UUID, payload: PolicyUpdate) -> Policy:
        PolicyValidator.validate_update(payload)
        policy = self.get_policy(tenant_id, policy_id)

        merged_document = payload.document or PolicyDocument(
            scope=policy.scope,
            conditions=policy.conditions,
            obligations=policy.obligations,
        )
        PolicyCreateRequest(
            name=payload.name or policy.name,
            description=payload.description if payload.description is not None else policy.description,
            enabled=payload.enabled if payload.enabled is not None else policy.enabled,
            priority=payload.priority if payload.priority is not None else policy.priority,
            effect=payload.effect or policy.effect,
            document=merged_document,
        )

        if payload.name is not None:
            policy.name = payload.name
        if payload.description is not None:
            policy.description = payload.description
        if payload.enabled is not None:
            policy.enabled = payload.enabled
        if payload.priority is not None:
            policy.priority = payload.priority
        if payload.effect is not None:
            policy.effect = payload.effect
        if payload.document is not None:
            policy.scope = payload.document.scope.model_dump(mode="json")
            policy.conditions = payload.document.conditions.model_dump(by_alias=True, mode="json")
            policy.obligations = [item.model_dump(mode="json") for item in payload.document.obligations]

        policy.current_version += 1
        policy.status = PolicyStatus.draft
        self._create_version_snapshot(
            policy=policy,
            version_number=policy.current_version,
            is_published_snapshot=False,
        )
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def publish_policy(self, tenant_id: UUID, policy_id: UUID) -> Policy:
        policy = self.get_policy(tenant_id, policy_id)
        policy.status = PolicyStatus.published
        policy.published_version = policy.current_version

        published_snapshot = next(
            version for version in self.repository.list_versions(policy.id) if version.version == policy.current_version
        )
        published_snapshot.status = PolicyStatus.published
        published_snapshot.is_published_snapshot = True

        self.db.commit()
        self.db.refresh(policy)
        return policy

    def disable_and_publish_policy(self, tenant_id: UUID, policy_id: UUID) -> Policy:
        """
        Disables a policy and publishes the change immediately.
        """
        self.update_policy(tenant_id, policy_id, PolicyUpdate(enabled=False))
        return self.publish_policy(tenant_id, policy_id)

    def list_versions(self, tenant_id: UUID, policy_id: UUID) -> List[PolicyVersion]:
        policy = self.get_policy(tenant_id, policy_id)
        return self.repository.list_versions(policy.id)

    def _create_version_snapshot(
        self, *, policy: Policy, version_number: int, is_published_snapshot: bool
    ) -> PolicyVersion:
        version = PolicyVersion(
            policy_id=policy.id,
            tenant_id=policy.tenant_id,
            version=version_number,
            name=policy.name,
            description=policy.description,
            enabled=policy.enabled,
            priority=policy.priority,
            effect=policy.effect,
            status=PolicyStatus.published if is_published_snapshot else PolicyStatus.draft,
            scope=policy.scope,
            conditions=policy.conditions,
            obligations=policy.obligations,
            is_published_snapshot=is_published_snapshot,
        )
        return self.repository.add_version(version)

    @staticmethod
    def published_at(policy: Policy) -> datetime:
        return datetime.now(timezone.utc)
