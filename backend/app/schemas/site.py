"""Site schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SiteBase(BaseModel):
    """Base site schema with common fields."""
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class SiteCreate(SiteBase):
    """Schema for creating a site."""
    pass


class SiteUpdate(BaseModel):
    """Schema for updating a site."""
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class SiteResponse(SiteBase):
    """Schema for site response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
