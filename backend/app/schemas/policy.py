from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from app.models.enums import PolicyEffect, PolicyStatus
from app.schemas.common import TimestampedSchema

PolicyField = Literal[
    "agent.type",
    "agent.attributes.department",
    "agent.attributes.team",
    "actor.type",
    "actor.department",
    "actor.attributes.role",
    "asset.type",
    "asset.owner",
    "asset.department",
    "asset.sensitivity_level",
    "asset.attributes.environment",
    "classifications.labels",
    "request.action",
    "request.purpose",
]
PolicyOperator = Literal[
    "eq",
    "neq",
    "in",
    "not_in",
    "contains",
    "contains_any",
    "gte",
    "lte",
    "exists",
]
ObligationType = Literal["mask_fields", "redact_labels", "rate_limit", "require_justification"]


class PolicyCondition(BaseModel):
    field: PolicyField
    operator: PolicyOperator
    value: Any = None

    @model_validator(mode="after")
    def validate_value_requirements(self) -> "PolicyCondition":
        if self.operator != "exists" and self.value is None:
            raise ValueError("Condition value is required unless operator is 'exists'")
        return self


class PolicyConditions(BaseModel):
    all: list[PolicyCondition] = Field(default_factory=list)
    any: list[PolicyCondition] = Field(default_factory=list)
    not_: list[PolicyCondition] = Field(default_factory=list, alias="not")


class PolicyScope(BaseModel):
    actions: list[Annotated[str, StringConstraints(min_length=1)]] = Field(min_length=1)
    asset_types: list[str] = Field(default_factory=list)
    agent_types: list[str] = Field(default_factory=list)
    actor_types: list[str] = Field(default_factory=list)


class PolicyObligation(BaseModel):
    type: ObligationType
    params: dict[str, Any] = Field(default_factory=dict)


class PolicyDocument(BaseModel):
    scope: PolicyScope
    conditions: PolicyConditions = Field(default_factory=PolicyConditions)
    obligations: list[PolicyObligation] = Field(default_factory=list)


class PolicyCreateRequest(BaseModel):
    name: Annotated[str, StringConstraints(min_length=3, max_length=255)]
    description: Annotated[str, StringConstraints(max_length=1000)] = ""
    enabled: bool = True
    priority: int = Field(default=100, ge=0, le=1000)
    effect: PolicyEffect
    document: PolicyDocument

    @field_validator("document")
    @classmethod
    def validate_obligations_against_effect(cls, document: PolicyDocument, info) -> PolicyDocument:
        effect = info.data.get("effect")
        if effect in {PolicyEffect.allow, PolicyEffect.deny, PolicyEffect.require_approval} and document.obligations:
            raise ValueError("Obligations are only supported for mask, redact, and rate_limit effects")
        if effect in {PolicyEffect.mask, PolicyEffect.redact, PolicyEffect.rate_limit} and not document.obligations:
            raise ValueError("Mask, redact, and rate_limit effects require at least one obligation")
        return document


class PolicyCreate(PolicyCreateRequest):
    tenant_id: UUID


class PolicyUpdate(BaseModel):
    name: Annotated[str, StringConstraints(min_length=3, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=1000)] | None = None
    enabled: bool | None = None
    priority: int | None = Field(default=None, ge=0, le=1000)
    effect: PolicyEffect | None = None
    document: PolicyDocument | None = None


class PolicyVersionResponse(TimestampedSchema):
    policy_id: UUID
    tenant_id: UUID
    version: int
    name: str
    description: str
    enabled: bool
    priority: int
    effect: PolicyEffect
    status: PolicyStatus
    scope: dict[str, Any]
    conditions: dict[str, Any]
    obligations: list[dict[str, Any]]
    is_published_snapshot: bool


class PolicyResponse(TimestampedSchema):
    tenant_id: UUID
    name: str
    description: str
    enabled: bool
    priority: int
    effect: PolicyEffect
    status: PolicyStatus
    current_version: int
    published_version: int | None
    scope: dict[str, Any]
    conditions: dict[str, Any]
    obligations: list[dict[str, Any]]


class PolicyListResponse(BaseModel):
    items: list[PolicyResponse]
    total: int


class PolicyPublishResponse(BaseModel):
    policy_id: UUID
    published_version: int
    status: PolicyStatus
    published_at: datetime
