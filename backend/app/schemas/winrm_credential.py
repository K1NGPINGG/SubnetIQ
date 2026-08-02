"""WinRM Credential schemas."""

from datetime import datetime
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
    domain: str | None = None


class WinRMCredentialCreate(WinRMCredentialBase):
    """Schema for creating a WinRM credential."""
    pass


class WinRMCredentialUpdate(BaseModel):
    """Schema for updating a WinRM credential."""
    name: str | None = None
    username: str | None = None
    password: str | None = None
    port: int | None = None
    use_ssl: bool | None = None
    auth_type: str | None = None
    domain: str | None = None
    is_active: bool | None = None


class WinRMCredentialResponse(BaseModel):
    """Schema for WinRM credential response."""
    id: UUID
    tenant_id: UUID
    name: str
    username: str
    port: int
    use_ssl: bool
    auth_type: str
    domain: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
