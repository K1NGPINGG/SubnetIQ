"""IP Address schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Supported VIP mechanisms.
VIPType = Literal["keepalived", "carp_vrrp", "load_balancer", "kubernetes", "floating_cloud"]

# Roles a backing node can play for a VIP.
VIPNodeRole = Literal["primary", "backup", "active", "standby"]


class VIPNodeBindingCreate(BaseModel):
    """Create a VIP -> node binding. ``node_ip_id`` must reference an existing IP."""
    node_ip_id: UUID
    role: VIPNodeRole = "primary"


class VIPNodeBindingRead(BaseModel):
    """Read model for a VIP -> node binding, including the node's address."""
    id: UUID
    vip_id: UUID
    node_ip_id: UUID
    role: str | None = None
    node_ip_address: str | None = None

    model_config = ConfigDict(from_attributes=True)


def _validate_vip_fields(values: dict) -> None:
    """Enforce VIP consistency: non-VIPs cannot carry vip_type or node bindings,
    and VIPs must declare a vip_type."""
    is_vip = bool(values.get("is_vip"))
    vip_type = values.get("vip_type")
    node_bindings = values.get("node_bindings")

    if not is_vip:
        if vip_type is not None:
            raise ValueError("vip_type is only allowed when is_vip is true")
        if node_bindings:
            raise ValueError("node_bindings are only allowed when is_vip is true")
    elif vip_type is None:
        raise ValueError("vip_type is required when is_vip is true")


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
    is_vip: bool = False
    vip_type: VIPType | None = None
    node_bindings: list[VIPNodeBindingCreate] | None = None

    @model_validator(mode="after")
    def _check_vip_consistency(self):
        _validate_vip_fields(self.model_dump())
        return self


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
    is_vip: bool | None = None
    vip_type: VIPType | None = None
    node_bindings: list[VIPNodeBindingCreate] | None = None

    @model_validator(mode="after")
    def _check_vip_consistency(self):
        # Only enforce when the caller explicitly touches `is_vip`.
        data = self.model_dump(exclude_unset=True)
        if "is_vip" not in data:
            return self
        if data.get("is_vip") is True:
            if data.get("vip_type") is None:
                raise ValueError("vip_type is required when is_vip is true")
        else:
            if data.get("vip_type") is not None:
                raise ValueError("vip_type is only allowed when is_vip is true")
            if data.get("node_bindings"):
                raise ValueError("node_bindings are only allowed when is_vip is true")
        return self


class IPAddressResponse(IPAddressBase):
    """Schema for IP address response."""
    id: UUID
    tenant_id: UUID
    family: int = 4
    allocated_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    node_bindings: list[VIPNodeBindingRead] | None = Field(
        default=None,
        validation_alias="vip_bindings",
    )

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
