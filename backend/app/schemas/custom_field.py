"""Custom Field schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CustomFieldBase(BaseModel):
    """Base custom field schema."""
    name: str
    label: str | None = None
    applies_to: str
    field_type: str = "text"
    required: bool = False
    default_value: str | None = None
    choices: list[str] | None = None
    description: str | None = None
    weight: int = 100


class CustomFieldCreate(CustomFieldBase):
    """Schema for creating a custom field."""
    pass


class CustomFieldUpdate(BaseModel):
    """Schema for updating a custom field."""
    name: str | None = None
    label: str | None = None
    applies_to: str | None = None
    field_type: str | None = None
    required: bool | None = None
    default_value: str | None = None
    choices: list[str] | None = None
    description: str | None = None
    weight: int | None = None


class CustomFieldResponse(CustomFieldBase):
    """Schema for custom field response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
