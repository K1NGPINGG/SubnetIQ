"""VRF schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VRFBase(BaseModel):
    """Base VRF schema with common fields."""
    name: str
    rd: str | None = None
    description: str | None = None
    enforce_unique: bool = True


class VRFCreate(VRFBase):
    """Schema for creating a VRF."""
    pass


class VRFUpdate(BaseModel):
    """Schema for updating a VRF."""
    name: str | None = None
    rd: str | None = None
    description: str | None = None
    enforce_unique: bool | None = None


class VRFResponse(VRFBase):
    """Schema for VRF response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
