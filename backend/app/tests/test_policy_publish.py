from uuid import uuid4

from app.models.enums import PolicyEffect, PolicyStatus
from app.modules.policies.service import PolicyService
from app.schemas.policy import PolicyCreate

from app.tests.test_policy_versioning import FakeRepository, FakeSession


def test_publish_marks_current_version_as_published() -> None:
    service = PolicyService(FakeSession())
    repository = FakeRepository()
    service.repository = repository
    tenant_id = uuid4()

    policy = service.create_policy(
        PolicyCreate(
            tenant_id=tenant_id,
            name="Cross Department Approval",
            effect=PolicyEffect.require_approval,
            document={
                "scope": {"actions": ["read"]},
                "conditions": {
                    "all": [{"field": "asset.department", "operator": "neq", "value": "support"}],
                    "any": [],
                    "not": [],
                },
                "obligations": [],
            },
        )
    )

    published = service.publish_policy(tenant_id, policy.id)

    assert published.status == PolicyStatus.published
    assert published.published_version == 1
    assert repository.versions[0].is_published_snapshot is True
