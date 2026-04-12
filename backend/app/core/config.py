from functools import lru_cache
from typing import Optional, Any, Dict, List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="NemoGuard Backend", alias="APP_NAME")
    app_env: str = Field(default="local", alias="APP_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")
    bootstrap_db_on_startup: bool = Field(default=True, alias="BOOTSTRAP_DB_ON_STARTUP")

    secret_key: str = Field(default="change-me", alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_minutes: int = Field(default=60 * 24 * 7, alias="REFRESH_TOKEN_EXPIRE_MINUTES")
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,https://sentra-ai-nudb.vercel.app,https://sentra-ai-tau.vercel.app,https://sentra-h9khz3zmh-faazilzias-projects.vercel.app",
        alias="CORS_ORIGINS",
    )
    supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    database_url: str = Field(
        default="postgresql+psycopg://nemoguard:nemoguard@localhost:5432/nemoguard",
        alias="DATABASE_URL",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v or ""
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    default_tenant_slug: str = Field(default="demo-tenant", alias="DEFAULT_TENANT_SLUG")
    default_admin_email: str = Field(default="admin@nemoguard.local", alias="DEFAULT_ADMIN_EMAIL")
    default_admin_password: str = Field(default="ChangeMe123!", alias="DEFAULT_ADMIN_PASSWORD")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
