"""IP Address schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IPAddressBase(BaseModel):
    """Base IP address schema with common fields."""
    address: str
    subnet_id: UUID
    hostname: Optional[str] = None
    status: str = "available"
    mac_address: Optional[str] = None
    device_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None


class IPAddressCreate(IPAddressBase):
    """Schema for creating an IP address."""
    pass


class IPAddressUpdate(BaseModel):
    """Schema for updating an IP address."""
    hostname: Optional[str] = None
    status: Optional[str] = None
    mac_address: Optional[str] = None
    device_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    subnet_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None


class IPAddressResponse(IPAddressBase):
    """Schema for IP address response."""
    id: UUID
    tenant_id: UUID
    allocated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IPAllocationRequest(BaseModel):
    """Schema for requesting the next available IP in a subnet."""
    subnet_id: UUID
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None


class IPAddressBulkCreateRequest(BaseModel):
    """Schema for bulk IP address creation."""
    addresses: List[IPAddressCreate]


class SubnetUsageResponse(BaseModel):
    """Schema for subnet IP usage statistics."""
    subnet_id: UUID
    network: str
    total_ips: int
    usable_hosts: int
    allocated: int
    reserved: int
    available: int
    utilization_pct: float