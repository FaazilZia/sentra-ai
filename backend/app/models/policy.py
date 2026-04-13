from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PolicyEffect, PolicyStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Policy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policies"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_policy_name_per_tenant"),)

    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False, index=True)
    effect: Mapped[PolicyEffect] = mapped_column(
        Enum(PolicyEffect, name="policy_effect"), nullable=False, index=True
    )
    status: Mapped[PolicyStatus] = mapped_column(
        Enum(PolicyStatus, name="policy_status"), default=PolicyStatus.draft, nullable=False, index=True
    )
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    published_version:Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    scope: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    conditions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    obligations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    versions = relationship(
        "PolicyVersion",
        back_populates="policy",
        cascade="all, delete-orphan",
        order_by="PolicyVersion.version.desc()",
    )
