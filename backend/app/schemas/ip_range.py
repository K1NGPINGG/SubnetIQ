"""IP Range schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IPRangeBase(BaseModel):
    """Base IP range schema."""
    subnet_id: UUID
    start_address: str
    end_address: str
    status: str = "active"
    description: str | None = None


class IPRangeCreate(IPRangeBase):
    """Schema for creating an IP range."""
    pass


class IPRangeUpdate(BaseModel):
    """Schema for updating an IP range."""
    start_address: str | None = None
    end_address: str | None = None
    status: str | None = None
    description: str | None = None


class IPRangeResponse(IPRangeBase):
    """Schema for IP range response."""
    id: UUID
    tenant_id: UUID
    family: int = 4
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
