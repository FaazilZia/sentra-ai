from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
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


from app.core.config import settings
import jwt

def get_current_principal(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> User | APIKey:
    auth_service = AuthService(db)

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
        # 1. Verification Step
        if not settings.supabase_jwt_secret:
            # Fallback for local dev if secret is not yet configured
            if settings.app_env == "local":
                 return User(
                    email="admin@nemoguard.local",
                    full_name="Local Admin",
                    tenant_id=db.scalar(select(Tenant.id).limit(1)),
                    password_hash="BYPASS"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Auth misconfigured: SUPABASE_JWT_SECRET missing"
            )

        try:
            payload = jwt.decode(
                token, 
                settings.supabase_jwt_secret, 
                algorithms=["HS256"],
                options={"verify_aud": False} # Supabase tokens often use 'authenticated' or custom aud
            )
            email = payload.get("email")
            if not email:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

            # 2. Lookup/Provision User
            user = auth_service.repository.get_user_by_email(email)
            if not user:
                # Auto-provision user into local DB for first-time login
                tenant = db.scalar(select(Tenant).limit(1))
                if not tenant:
                    raise HTTPException(status_code=500, detail="Default tenant missing")
                
                user = User(
                    email=email,
                    full_name=email.split("@")[0].title(),
                    tenant_id=tenant.id,
                    password_hash="EXTERNAL_OAUTH" # No local password for Supabase users
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            return user

        except jwt.PyJWTError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")

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
