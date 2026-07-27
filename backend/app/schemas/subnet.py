"""Subnet schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SubnetBase(BaseModel):
    """Base subnet schema with common fields."""
    network_address: str
    prefix_length: int
    name: str
    description: Optional[str] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    site_id: Optional[UUID] = None
    vlan_id: Optional[UUID] = None
    parent_subnet_id: Optional[UUID] = None


class SubnetCreate(SubnetBase):
    """Schema for creating a subnet."""
    pass


class SubnetUpdate(BaseModel):
    """Schema for updating a subnet."""
    name: Optional[str] = None
    description: Optional[str] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    site_id: Optional[UUID] = None
    vlan_id: Optional[UUID] = None
    parent_subnet_id: Optional[UUID] = None


class SubnetResponse(SubnetBase):
    """Schema for subnet response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubnetTreeResponse(BaseModel):
    """Schema for subnet tree (parent + children)."""
    subnet: SubnetResponse
    children: List[SubnetResponse]