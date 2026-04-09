from uuid import UUID

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class APIKeyCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)


class APIKeyCreateResponse(BaseModel):
    id: UUID
    name: str
    key: str
    key_prefix: str
