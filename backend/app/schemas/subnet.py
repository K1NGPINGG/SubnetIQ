"""Subnet schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SubnetBase(BaseModel):
    """Base subnet schema with common fields."""
    network_address: str
    prefix_length: int
    name: str
    description: str | None = None
    gateway: str | None = None
    dns_servers: str | None = None
    vrf_id: UUID | None = None
    site_id: UUID | None = None
    vlan_id: UUID | None = None
    parent_subnet_id: UUID | None = None
    role: str | None = None
    status: str = "active"
    is_container: bool = False
    tags: list[str] | None = None
    custom_fields: dict | None = None


class SubnetCreate(SubnetBase):
    """Schema for creating a subnet."""
    pass


class SubnetUpdate(BaseModel):
    """Schema for updating a subnet."""
    name: str | None = None
    description: str | None = None
    gateway: str | None = None
    dns_servers: str | None = None
    vrf_id: UUID | None = None
    site_id: UUID | None = None
    vlan_id: UUID | None = None
    parent_subnet_id: UUID | None = None
    role: str | None = None
    status: str | None = None
    is_container: bool | None = None
    tags: list[str] | None = None
    custom_fields: dict | None = None


class SubnetResponse(SubnetBase):
    """Schema for subnet response."""
    id: UUID
    tenant_id: UUID
    family: int = 4
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubnetTreeResponse(BaseModel):
    """Schema for subnet tree (parent + children)."""
    subnet: SubnetResponse
    children: list[SubnetResponse]
