from uuid import UUID
import enum
from sqlalchemy import Enum, ForeignKey, String, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

class ConnectorType(str, enum.Enum):
    sql = "sql"
    gdrive = "gdrive"
    s3 = "s3"
    local = "local"

class Connector(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "connectors"

    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ConnectorType] = mapped_column(Enum(ConnectorType), nullable=False, default=ConnectorType.sql)
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False) # Connection strings / Credentials
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    last_scan_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
