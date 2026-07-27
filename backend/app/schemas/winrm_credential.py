"""WinRM Credential schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WinRMCredentialBase(BaseModel):
    """Base WinRM credential schema."""
    name: str
    username: str
    password: str
    port: int = 5985
    use_ssl: bool = False
    auth_type: str = "basic"
    domain: Optional[str] = None


class WinRMCredentialCreate(WinRMCredentialBase):
    """Schema for creating a WinRM credential."""
    pass


class WinRMCredentialUpdate(BaseModel):
    """Schema for updating a WinRM credential."""
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    use_ssl: Optional[bool] = None
    auth_type: Optional[str] = None
    domain: Optional[str] = None
    is_active: Optional[bool] = None


class WinRMCredentialResponse(BaseModel):
    """Schema for WinRM credential response."""
    id: UUID
    tenant_id: UUID
    name: str
    username: str
    port: int
    use_ssl: bool
    auth_type: str
    domain: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
