"""RIR schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RIRBase(BaseModel):
    """Base RIR schema."""
    name: str
    slug: str
    description: str | None = None


class RIRCreate(RIRBase):
    """Schema for creating an RIR."""
    pass


class RIRUpdate(BaseModel):
    """Schema for updating an RIR."""
    name: str | None = None
    slug: str | None = None
    description: str | None = None


class RIRResponse(RIRBase):
    """Schema for RIR response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
