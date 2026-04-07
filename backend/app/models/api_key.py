from uuid import UUID

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import APIKeyType
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class APIKey(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "api_keys"

    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    key_type: Mapped[APIKeyType] = mapped_column(
        Enum(APIKeyType, name="api_key_type"), default=APIKeyType.service, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    tenant = relationship("Tenant", back_populates="api_keys")
