"""Custom Validation Rule schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CustomValidationRuleBase(BaseModel):
    """Base custom validation rule schema."""
    name: str
    entity_type: str
    condition: dict | None = None
    error_message: str
    enabled: bool = True
    enforce_on_delete: bool = False
    weight: int = 100


class CustomValidationRuleCreate(CustomValidationRuleBase):
    """Schema for creating a custom validation rule."""
    pass


class CustomValidationRuleUpdate(BaseModel):
    """Schema for updating a custom validation rule."""
    name: str | None = None
    entity_type: str | None = None
    condition: dict | None = None
    error_message: str | None = None
    enabled: bool | None = None
    enforce_on_delete: bool | None = None
    weight: int | None = None


class CustomValidationRuleResponse(CustomValidationRuleBase):
    """Schema for custom validation rule response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
