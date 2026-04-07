from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.api_key import APIKey
from app.models.tenant import Tenant
from app.models.user import User
from app.modules.auth.service import AuthService
from app.modules.tenants.service import TenantService


DbSession = Annotated[Session, Depends(get_db)]


def get_correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def get_current_principal(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> User | APIKey:
    auth_service = AuthService(db)

    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = decode_token(token)
        except Exception as exc:  # pragma: no cover - normalized below
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user = auth_service.get_user_for_token_subject(payload["sub"])
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
        return user

    if x_api_key:
        api_key = auth_service.authenticate_api_key(x_api_key)
        if api_key is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        return api_key

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


def get_current_user(principal: Annotated[User | APIKey, Depends(get_current_principal)]) -> User:
    if not isinstance(principal, User):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User token required")
    return principal


def get_current_tenant(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    x_tenant_id: Annotated[str | None, Header()] = None,
) -> Tenant:
    tenant_id = UUID(x_tenant_id) if x_tenant_id else current_user.tenant_id
    if tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")

    tenant = TenantService(db).get_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant
