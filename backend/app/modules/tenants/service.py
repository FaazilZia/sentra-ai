from uuid import UUID

from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.modules.tenants.repository import TenantRepository


class TenantService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = TenantRepository(db)

    def get_by_id(self, tenant_id: UUID) -> Tenant | None:
        return self.repository.get_by_id(tenant_id)
