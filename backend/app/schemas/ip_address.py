"""IP Address schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IPAddressBase(BaseModel):
    """Base IP address schema with common fields."""
    address: str
    subnet_id: UUID
    vrf_id: UUID | None = None
    hostname: str | None = None
    status: str = "available"
    mac_address: str | None = None
    device_type: str | None = None
    description: str | None = None
    assigned_to: str | None = None
    tags: list[str] | None = None
    custom_fields: dict | None = None


class IPAddressCreate(IPAddressBase):
    """Schema for creating an IP address."""
    pass


class IPAddressUpdate(BaseModel):
    """Schema for updating an IP address."""
    hostname: str | None = None
    status: str | None = None
    mac_address: str | None = None
    device_type: str | None = None
    description: str | None = None
    assigned_to: str | None = None
    subnet_id: UUID | None = None
    vrf_id: UUID | None = None
    expires_at: datetime | None = None
    tags: list[str] | None = None
    custom_fields: dict | None = None


class IPAddressResponse(IPAddressBase):
    """Schema for IP address response."""
    id: UUID
    tenant_id: UUID
    family: int = 4
    allocated_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IPAllocationRequest(BaseModel):
    """Schema for requesting the next available IP in a subnet."""
    subnet_id: UUID
    hostname: str | None = None
    device_type: str | None = None
    description: str | None = None
    assigned_to: str | None = None


class IPAddressBulkCreateRequest(BaseModel):
    """Schema for bulk IP address creation."""
    addresses: list[IPAddressCreate]


class SubnetUsageResponse(BaseModel):
    """Schema for subnet IP usage statistics."""
    subnet_id: UUID
    network: str
    family: int = 4
    total_ips: int
    usable_hosts: int
    allocated: int
    reserved: int
    available: int
    utilization_pct: float
