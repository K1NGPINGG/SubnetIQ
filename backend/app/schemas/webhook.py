"""Webhook schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class WebhookBase(BaseModel):
    """Base webhook schema."""
    name: str
    url: str
    http_method: str = "POST"
    secret: str | None = None
    events: list[str] | None = None
    headers: dict | None = None
    enabled: bool = True
    ssl_verify: bool = True
    timeout: int = 5
    retry_count: int = 3

    @field_validator("http_method")
    @classmethod
    def validate_method(cls, v):
        method = v.upper()
        if method not in {"GET", "POST", "PUT", "PATCH"}:
            raise ValueError("http_method must be one of GET, POST, PUT, PATCH")
        return method

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if not v.startswith(("http://", "https://")):
            raise ValueError("url must start with http:// or https://")
        return v


class WebhookCreate(WebhookBase):
    """Schema for creating a webhook."""
    pass


class WebhookUpdate(BaseModel):
    """Schema for updating a webhook."""
    name: str | None = None
    url: str | None = None
    http_method: str | None = None
    secret: str | None = None
    events: list[str] | None = None
    headers: dict | None = None
    enabled: bool | None = None
    ssl_verify: bool | None = None
    timeout: int | None = None
    retry_count: int | None = None

    @field_validator("http_method")
    @classmethod
    def validate_method(cls, v):
        if v is None:
            return v
        method = v.upper()
        if method not in {"GET", "POST", "PUT", "PATCH"}:
            raise ValueError("http_method must be one of GET, POST, PUT, PATCH")
        return method


class WebhookResponse(WebhookBase):
    """Schema for webhook response."""
    id: UUID
    tenant_id: UUID
    last_status: int | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
