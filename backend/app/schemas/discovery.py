"""Discovery schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DiscoveryScanBase(BaseModel):
    """Base discovery scan schema with common fields."""
    subnet_id: UUID
    scan_type: str = "icmp"


class DiscoveryScanCreate(DiscoveryScanBase):
    """Schema for creating a discovery scan."""
    is_scheduled: bool = False
    schedule_time: Optional[datetime] = None
    is_recursive: bool = False
    interval_minutes: Optional[int] = None


class DiscoveryScanResponse(DiscoveryScanBase):
    """Schema for discovery scan response."""
    id: UUID
    tenant_id: UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[Any] = None
    error_message: Optional[str] = None
    is_scheduled: bool = False
    schedule_time: Optional[datetime] = None
    is_recursive: bool = False
    interval_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanResultsResponse(BaseModel):
    """Response containing scan results for a subnet."""
    scan_id: UUID
    subnet_id: UUID
    scan_type: str
    status: str
    completed_at: Optional[datetime] = None
    results: Optional[Any] = None


class DiscoveryRunRequest(BaseModel):
    """Request body for POST /discovery/run — unified asset discovery trigger."""
    scan_type: str  # "SNMP", "WINRM", "PING", "FULL"
    target_ips: Optional[list[str]] = None  # Explicit IP list
    subnet_id: Optional[UUID] = None  # Or scan an entire subnet
    snmp_credential_id: Optional[UUID] = None
    snmp_community: Optional[str] = "public"
    winrm_credential_id: Optional[UUID] = None
    winrm_username: Optional[str] = None
    winrm_password: Optional[str] = None
    winrm_port: int = 5985
    winrm_use_ssl: bool = False


class DiscoveryRunResponse(BaseModel):
    """Response from POST /discovery/run."""
    task_id: str
    scan_id: str
    scan_type: str
    target_count: int
    message: str
