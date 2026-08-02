"""Asset schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AssetBase(BaseModel):
    """Base asset schema with common fields."""
    ip_address: str
    mac_address: str | None = None
    hostname: str | None = None
    domain: str | None = None
    device_type: str | None = "Unknown"
    discovery_source: str = "PING"
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    cpu_cores: int | None = None
    ram_gb: float | None = None
    status: str = "Online"


class AssetCreate(AssetBase):
    """Schema for creating an asset."""
    pass


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    mac_address: str | None = None
    hostname: str | None = None
    domain: str | None = None
    device_type: str | None = None
    discovery_source: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    cpu_cores: int | None = None
    ram_gb: float | None = None
    status: str | None = None


class AssetResponse(AssetBase):
    """Schema for asset response."""
    id: UUID
    tenant_id: UUID
    last_scanned_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssetDetailResponse(AssetResponse):
    """Detailed asset response with raw scan data and network interfaces."""
    raw_scan_data: Any | None = None
    network_interfaces: Any | None = None


class AssetListResponse(BaseModel):
    """Paginated asset list response."""
    assets: list[AssetResponse]
    total: int
    page: int
    page_size: int
