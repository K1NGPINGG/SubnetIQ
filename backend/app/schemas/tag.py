"""Tag schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TagBase(BaseModel):
    """Base tag schema."""
    name: str
    slug: str
    color: str = "#1976D2"
    description: str | None = None


class TagCreate(TagBase):
    """Schema for creating a tag."""
    pass


class TagUpdate(BaseModel):
    """Schema for updating a tag."""
    name: str | None = None
    slug: str | None = None
    color: str | None = None
    description: str | None = None


class TagResponse(TagBase):
    """Schema for tag response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
