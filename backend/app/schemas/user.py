from uuid import UUID

from pydantic import EmailStr

from app.schemas.common import TimestampedSchema


class MeResponse(TimestampedSchema):
    email: EmailStr
    full_name: str
    tenant_id: UUID
    is_active: bool
