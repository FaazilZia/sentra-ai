from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_key import APIKey
from app.models.user import User


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_user_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_api_key_by_prefix(self, key_prefix: str) -> APIKey | None:
        return self.db.scalar(select(APIKey).where(APIKey.key_prefix == key_prefix, APIKey.is_active.is_(True)))

    def add_api_key(self, api_key: APIKey) -> APIKey:
        self.db.add(api_key)
        self.db.flush()
        return api_key
