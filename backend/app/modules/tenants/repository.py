from uuid import UUID

from sqlalchemy.orm import Session

from app.models.tenant import Tenant


class TenantRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, tenant_id: UUID) -> Tenant | None:
        return self.db.get(Tenant, tenant_id)

    def add(self, tenant: Tenant) -> Tenant:
        self.db.add(tenant)
        self.db.flush()
        return tenant
