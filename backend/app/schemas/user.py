from uuid import UUID, uuid4
from pydantic import Field
from app.schemas.common import TimestampedSchema


class MeResponse(TimestampedSchema):
    email: str = ""
    full_name: str = ""
    tenant_id: UUID = Field(default_factory=uuid4)
    is_active: bool = True
