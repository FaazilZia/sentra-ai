from functools import lru_cache

from pydantic import Field
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
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
    )

    database_url: str = Field(
        default="postgresql+psycopg://nemoguard:nemoguard@localhost:5432/nemoguard",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    default_tenant_slug: str = Field(default="demo-tenant", alias="DEFAULT_TENANT_SLUG")
    default_admin_email: str = Field(default="admin@nemoguard.local", alias="DEFAULT_ADMIN_EMAIL")
    default_admin_password: str = Field(default="ChangeMe123!", alias="DEFAULT_ADMIN_PASSWORD")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
