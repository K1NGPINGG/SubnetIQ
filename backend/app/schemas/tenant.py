"""Tenant schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TenantBase(BaseModel):
    """Base tenant schema with common fields."""
    name: str
    slug: str
    logo_url: str | None = None
    primary_color: str | None = "#1976D2"


class TenantCreate(TenantBase):
    """Schema for creating a tenant."""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating a tenant."""
    name: str | None = None
    slug: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    is_active: bool | None = None


class TenantResponse(TenantBase):
    """Schema for tenant response."""
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
