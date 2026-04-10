from uuid import UUID

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Incident(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "incidents"

    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    agent_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    policy_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("policies.id"), index=True, nullable=True)
    
    severity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="unresolved", nullable=False)
    
    prompt_excerpt: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    response_excerpt: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    
    event_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
