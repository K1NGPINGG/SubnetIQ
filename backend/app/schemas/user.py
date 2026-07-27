"""User schemas."""

from datetime import datetime
from typing import Optional
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
    email: Optional[str] = None
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    mfa_enforced: Optional[bool] = None
    password: Optional[str] = None


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