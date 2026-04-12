from uuid import UUID
from sqlalchemy import ForeignKey, String, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

class ConsentRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "consent_records"

    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # GRANT, WITHDRAW
    
    notice_version: Mapped[str] = mapped_column(String(50), default="1.0", nullable=False)
    
    # Tamper-proofing: This record's hash depends on the previous record's hash
    hashing_chain: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    
    # Store any extra context (IP address, device info, browser)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
