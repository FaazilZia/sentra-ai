from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.policy import Policy
from app.models.policy_version import PolicyVersion


class PolicyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_tenant(self, tenant_id: UUID) -> Tuple[List[Policy], int]:
        query = select(Policy).where(Policy.tenant_id == tenant_id).order_by(Policy.priority.desc(), Policy.created_at.desc())
        items = list(self.db.scalars(query).all())
        total = self.db.scalar(select(func.count()).select_from(Policy).where(Policy.tenant_id == tenant_id)) or 0
        return items, total

    def get_policy(self, policy_id: UUID) ->Optional[ Policy ]:
        return self.db.get(Policy, policy_id)

    def get_policy_for_tenant(self, tenant_id: UUID, policy_id: UUID) ->Optional[ Policy ]:
        return self.db.scalar(select(Policy).where(Policy.id == policy_id, Policy.tenant_id == tenant_id))

    def list_versions(self, policy_id: UUID) -> List[PolicyVersion]:
        return list(
            self.db.scalars(
                select(PolicyVersion)
                .where(PolicyVersion.policy_id == policy_id)
                .order_by(PolicyVersion.version.desc())
            ).all()
        )

    def add_policy(self, policy: Policy) -> Policy:
        self.db.add(policy)
        self.db.flush()
        return policy

    def add_version(self, version: PolicyVersion) -> PolicyVersion:
        self.db.add(version)
        self.db.flush()
        return version
