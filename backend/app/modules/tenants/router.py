from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DbSession, get_current_tenant, get_current_user
from app.models.tenant import Tenant
from app.models.user import User
from app.modules.tenants.service import TenantService
from app.schemas.tenant import TenantResponse

router = APIRouter()


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: UUID,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> TenantResponse:
    if tenant_id != current_tenant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant access denied")

    tenant = TenantService(db).get_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return TenantResponse.model_validate(tenant)
