import secrets
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.api_key import APIKey
from app.models.enums import APIKeyType
from app.models.user import User
from app.modules.auth.repository import AuthRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AuthRepository(db)

    def authenticate_user(self, email: str, password: str) -> User | None:
        user = self.repository.get_user_by_email(email)
        if user is None or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def create_token_pair(self, user: User) -> dict[str, str]:
        return {
            "access_token": create_access_token(str(user.id), user.tenant_id),
            "refresh_token": create_refresh_token(str(user.id), user.tenant_id),
        }

    def refresh_token_pair(self, user_id: UUID) -> dict[str, str] | None:
        user = self.repository.get_user_by_id(user_id)
        if user is None or not user.is_active:
            return None
        return self.create_token_pair(user)

    def get_user_for_token_subject(self, subject: str) -> User | None:
        return self.repository.get_user_by_id(UUID(subject))

    def issue_api_key(self, *, tenant_id: UUID, name: str) -> tuple[APIKey, str]:
        raw_key = f"ng_{secrets.token_urlsafe(24)}"
        prefix = raw_key[:12]
        api_key = APIKey(
            tenant_id=tenant_id,
            name=name,
            key_prefix=prefix,
            key_hash=hash_password(raw_key),
            key_type=APIKeyType.service,
            is_active=True,
        )
        self.repository.add_api_key(api_key)
        self.db.commit()
        self.db.refresh(api_key)
        return api_key, raw_key

    def authenticate_api_key(self, raw_key: str) -> APIKey | None:
        prefix = raw_key[:12]
        api_key = self.repository.get_api_key_by_prefix(prefix)
        if api_key is None:
            return None
        if not verify_password(raw_key, api_key.key_hash):
            return None
        return api_key


def hash_user_password(password: str) -> str:
    return hash_password(password)
