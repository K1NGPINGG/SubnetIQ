"""VLAN schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VLANBase(BaseModel):
    """Base VLAN schema with common fields."""
    vlan_id: int
    name: str
    description: str | None = None
    site_id: UUID | None = None


class VLANCreate(VLANBase):
    """Schema for creating a VLAN."""
    pass


class VLANUpdate(BaseModel):
    """Schema for updating a VLAN."""
    vlan_id: int | None = None
    name: str | None = None
    description: str | None = None
    site_id: UUID | None = None


class VLANResponse(VLANBase):
    """Schema for VLAN response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
