import secrets
from typing import Annotated, Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import DbSession, get_current_tenant
from app.core.security import hash_password
from app.models.api_key import APIKey
from app.models.tenant import Tenant
from pydantic import BaseModel

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    created_at: str
    is_active: bool

class APIKeyBundle(BaseModel):
    name: str
    api_key: str  # The full secret key, only shown once

@router.post("/", response_model=APIKeyBundle, status_code=status.HTTP_201_CREATED)
def create_key(
    key_in: APIKeyCreate,
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
) -> Any:
    # 1. Generate secure secret key
    raw_key = f"sentra_live_{secrets.token_urlsafe(32)}"
    prefix = raw_key[:12]
    
    # 2. Hash it for storage
    hashed_key = hash_password(raw_key)

    # 3. Save to DB
    api_key = APIKey(
        tenant_id=tenant.id,
        name=key_in.name,
        key_prefix=prefix,
        key_hash=hashed_key,
        is_active=True
    )
    db.add(api_key)
    db.commit()

    return {
        "name": api_key.name,
        "api_key": raw_key
    }

@router.get("/", response_model=List[APIKeyResponse])
def list_keys(
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
) -> Any:
    query = select(APIKey).where(APIKey.tenant_id == tenant.id).order_by(APIKey.created_at.desc())
    keys = db.scalars(query).all()
    
    return [
        {
            "id": str(key.id),
            "name": key.name,
            "key_prefix": key.key_prefix,
            "created_at": key.created_at.isoformat(),
            "is_active": key.is_active
        }
        for key in keys
    ]

@router.delete("/{key_id}")
def revoke_key(
    key_id: str,
    db: DbSession,
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
) -> Any:
    import uuid
    uid = uuid.UUID(key_id)
    
    key = db.scalar(select(APIKey).where(APIKey.id == uid, APIKey.tenant_id == tenant.id))
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    db.delete(key)
    db.commit()
    return {"status": "ok"}
