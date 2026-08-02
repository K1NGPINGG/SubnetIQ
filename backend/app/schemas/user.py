"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: str
    display_name: str
    role: str = "viewer"


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: str | None = None
    display_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    mfa_enforced: bool | None = None
    password: str | None = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: UUID
    tenant_id: UUID
    is_active: bool
    mfa_enabled: bool
    mfa_enforced: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
