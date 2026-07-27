"""Asset schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AssetBase(BaseModel):
    """Base asset schema with common fields."""
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    domain: Optional[str] = None
    device_type: Optional[str] = "Unknown"
    discovery_source: str = "PING"
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_gb: Optional[float] = None
    status: str = "Online"


class AssetCreate(AssetBase):
    """Schema for creating an asset."""
    pass


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    domain: Optional[str] = None
    device_type: Optional[str] = None
    discovery_source: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_gb: Optional[float] = None
    status: Optional[str] = None


class AssetResponse(AssetBase):
    """Schema for asset response."""
    id: UUID
    tenant_id: UUID
    last_scanned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssetDetailResponse(AssetResponse):
    """Detailed asset response with raw scan data and network interfaces."""
    raw_scan_data: Optional[Any] = None
    network_interfaces: Optional[Any] = None


class AssetListResponse(BaseModel):
    """Paginated asset list response."""
    assets: list[AssetResponse]
    total: int
    page: int
    page_size: int
