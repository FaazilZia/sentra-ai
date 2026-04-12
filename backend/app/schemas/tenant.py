from app.schemas.common import TimestampedSchema


class TenantResponse(TimestampedSchema):
    name: str
    slug: str
    is_active: bool
