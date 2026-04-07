from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.enums import PolicyEffect
from app.schemas.policy import PolicyCreateRequest


def test_mask_policy_requires_obligations() -> None:
    with pytest.raises(ValidationError):
        PolicyCreateRequest(
            name="Mask Support Output",
            description="",
            enabled=True,
            priority=100,
            effect=PolicyEffect.mask,
            document={
                "scope": {"actions": ["summarize"]},
                "conditions": {"all": [], "any": [], "not": []},
                "obligations": [],
            },
        )


def test_deny_policy_rejects_obligations() -> None:
    with pytest.raises(ValidationError):
        PolicyCreateRequest(
            name="Deny Exports",
            effect=PolicyEffect.deny,
            document={
                "scope": {"actions": ["export"]},
                "conditions": {"all": [], "any": [], "not": []},
                "obligations": [{"type": "mask_fields", "params": {"fields": ["email"]}}],
            },
        )


def test_valid_policy_document_accepts_supported_fields() -> None:
    payload = PolicyCreateRequest(
        name="Require Approval",
        effect=PolicyEffect.require_approval,
        document={
            "scope": {"actions": ["read"], "asset_types": ["table"]},
            "conditions": {
                "all": [
                    {
                        "field": "asset.sensitivity_level",
                        "operator": "eq",
                        "value": "high",
                    }
                ],
                "any": [],
                "not": [],
            },
            "obligations": [],
        },
    )

    assert payload.document.scope.actions == ["read"]
