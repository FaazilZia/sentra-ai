from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import RoleName
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[RoleName] = mapped_column(Enum(RoleName, name="role_name"), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)

    users = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
