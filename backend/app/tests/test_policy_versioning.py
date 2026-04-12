from uuid import uuid4

from app.models.enums import PolicyEffect, PolicyStatus
from app.modules.policies.service import PolicyService
from app.schemas.policy import PolicyCreate, PolicyUpdate


class FakeSession:
    def __init__(self) -> None:
        self.flushed_objects = []
        self.committed = False

    def add(self, obj) -> None:
        self.flushed_objects.append(obj)

    def flush(self) -> None:
        return None

    def commit(self) -> None:
        self.committed = True

    def refresh(self, _obj) -> None:
        return None


class FakeRepository:
    def __init__(self) -> None:
        self.policy = None
        self.versions = []

    def list_by_tenant(self, tenant_id):
        return [], 0

    def get_policy_for_tenant(self, tenant_id, policy_id):
        if self.policy and self.policy.id == policy_id and self.policy.tenant_id == tenant_id:
            return self.policy
        return None

    def add_policy(self, policy):
        if getattr(policy, "id", None) is None:
            policy.id = uuid4()
        self.policy = policy
        return policy

    def add_version(self, version):
        if getattr(version, "id", None) is None:
            version.id = uuid4()
        self.versions.append(version)
        return version

    def list_versions(self, policy_id):
        return [version for version in self.versions if version.policy_id == policy_id]


def build_service() -> tuple[PolicyService, FakeRepository]:
    service = PolicyService(FakeSession())
    repository = FakeRepository()
    service.repository = repository
    return service, repository


def test_create_policy_creates_initial_version() -> None:
    service, repository = build_service()
    tenant_id = uuid4()

    policy = service.create_policy(
        PolicyCreate(
            tenant_id=tenant_id,
            name="Deny PII Export",
            effect=PolicyEffect.deny,
            document={
                "scope": {"actions": ["export"]},
                "conditions": {"all": [], "any": [], "not": []},
                "obligations": [],
            },
        )
    )

    assert policy.current_version == 1
    assert len(repository.versions) == 1
    assert repository.versions[0].version == 1
    assert repository.versions[0].status == PolicyStatus.draft


def test_update_policy_increments_version() -> None:
    service, repository = build_service()
    tenant_id = uuid4()
    policy = service.create_policy(
        PolicyCreate(
            tenant_id=tenant_id,
            name="Deny PII Export",
            effect=PolicyEffect.deny,
            document={
                "scope": {"actions": ["export"]},
                "conditions": {"all": [], "any": [], "not": []},
                "obligations": [],
            },
        )
    )

    updated = service.update_policy(
        tenant_id,
        policy.id,
        PolicyUpdate(priority=250),
    )

    assert updated.current_version == 2
    assert len(repository.versions) == 2
    assert repository.versions[0].version == 1
    assert repository.versions[1].version == 2
