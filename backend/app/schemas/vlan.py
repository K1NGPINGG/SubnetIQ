"""VLAN schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VLANBase(BaseModel):
    """Base VLAN schema with common fields."""
    vlan_id: int
    name: str
    description: Optional[str] = None
    site_id: Optional[UUID] = None


class VLANCreate(VLANBase):
    """Schema for creating a VLAN."""
    pass


class VLANUpdate(BaseModel):
    """Schema for updating a VLAN."""
    vlan_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[UUID] = None


class VLANResponse(VLANBase):
    """Schema for VLAN response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)