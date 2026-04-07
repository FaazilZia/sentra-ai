from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PolicyEffect, PolicyStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PolicyVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_versions"
    __table_args__ = (UniqueConstraint("policy_id", "version", name="uq_policy_version_number"),)

    policy_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("policies.id"), index=True)
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    effect: Mapped[PolicyEffect] = mapped_column(Enum(PolicyEffect, name="policy_effect"), nullable=False)
    status: Mapped[PolicyStatus] = mapped_column(Enum(PolicyStatus, name="policy_status"), nullable=False)
    scope: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    conditions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    obligations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_published_snapshot: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    policy = relationship("Policy", back_populates="versions")
