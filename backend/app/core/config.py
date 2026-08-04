"""Application configuration using pydantic-settings."""


from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "SubnetIQ"
    APP_VERSION: str = "1.2.2"
    DEBUG: bool = False

    # Release updates
    UPDATE_ENABLED: bool = True
    GITHUB_OWNER: str = "K1NGPINGG"
    GITHUB_REPO: str = "SubnetIQ"
    GITHUB_API_URL: str = "https://api.github.com"
    UPDATE_DATA_DIR: str = "/updates"
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://ipam_user:ipam_password@localhost:5432/ipam_db"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Azure AD
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""

    # LDAP
    LDAP_SERVER: str = "ldap://localhost:389"
    LDAP_BASE_DN: str = "dc=example,dc=com"
    LDAP_BIND_DN: str = "cn=admin,dc=example,dc=com"
    LDAP_BIND_PASSWORD: str = ""
    LDAP_USER_SEARCH_BASE: str = "ou=users,dc=example,dc=com"

    # Credential Encryption (Fernet)
    ENCRYPTION_KEY: str = ""

    # Superadmin
    SUPERADMIN_EMAIL: str = "admin@ipam.local"
    SUPERADMIN_PASSWORD: str = "changeme123!"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string if needed."""
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v


settings = Settings()
