from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DbSession, get_current_tenant, get_current_user
from app.core.security import decode_token
from app.models.tenant import Tenant
from app.models.user import User
from app.modules.auth.service import AuthService
from app.schemas.auth import (
    APIKeyCreateRequest,
    APIKeyCreateResponse,
    LoginRequest,
    TokenRefreshRequest,
    TokenResponse,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    service = AuthService(db)
    user = service.authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(**service.create_token_pair(user))


@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(payload: TokenRefreshRequest, db: DbSession) -> TokenResponse:
    try:
        decoded = decode_token(payload.refresh_token)
    except Exception as exc:  # pragma: no cover - normalized below
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    tokens = AuthService(db).refresh_token_pair(UUID(decoded["sub"]))
    if tokens is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return TokenResponse(**tokens)


@router.post("/api-key", response_model=APIKeyCreateResponse)
def create_api_key(
    payload: APIKeyCreateRequest,
    db: DbSession,
    _: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
) -> APIKeyCreateResponse:
    api_key, raw_key = AuthService(db).issue_api_key(tenant_id=current_tenant.id, name=payload.name)
    return APIKeyCreateResponse(id=api_key.id, name=api_key.name, key=raw_key, key_prefix=api_key.key_prefix)
