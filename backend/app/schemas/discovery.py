"""Discovery schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DiscoveryScanBase(BaseModel):
    """Base discovery scan schema with common fields."""
    subnet_id: UUID
    scan_type: str = "icmp"


class DiscoveryScanCreate(DiscoveryScanBase):
    """Schema for creating a discovery scan."""
    is_scheduled: bool = False
    schedule_time: datetime | None = None
    is_recursive: bool = False
    interval_minutes: int | None = None


class DiscoveryScanResponse(DiscoveryScanBase):
    """Schema for discovery scan response. ``subnet_id`` is nullable because
    scans triggered via ``/discovery/run`` may target explicit IP lists."""
    subnet_id: UUID | None = None  # type: ignore[assignment]  # optional for IP-list scans
    id: UUID
    tenant_id: UUID
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    results: Any | None = None
    error_message: str | None = None
    is_scheduled: bool = False
    schedule_time: datetime | None = None
    is_recursive: bool = False
    interval_minutes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanResultsResponse(BaseModel):
    """Response containing scan results for a subnet."""
    scan_id: UUID
    subnet_id: UUID
    scan_type: str
    status: str
    completed_at: datetime | None = None
    results: Any | None = None


class DiscoveryRunRequest(BaseModel):
    """Request body for POST /discovery/run — unified asset discovery trigger."""
    scan_type: str  # "SNMP", "WINRM", "PING", "FULL"
    target_ips: list[str] | None = None  # Explicit IP list
    subnet_id: UUID | None = None  # Or scan an entire subnet
    snmp_credential_id: UUID | None = None
    snmp_community: str | None = "public"
    winrm_credential_id: UUID | None = None
    winrm_username: str | None = None
    winrm_password: str | None = None
    winrm_port: int = 5985
    winrm_use_ssl: bool = False


class DiscoveryRunResponse(BaseModel):
    """Response from POST /discovery/run."""
    task_id: str
    scan_id: str
    scan_type: str
    target_count: int
    message: str
