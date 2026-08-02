"""Aggregate schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AggregateBase(BaseModel):
    """Base aggregate schema."""
    network_address: str
    prefix_length: int
    description: str | None = None
    rir_id: UUID | None = None


class AggregateCreate(AggregateBase):
    """Schema for creating an aggregate."""
    pass


class AggregateUpdate(BaseModel):
    """Schema for updating an aggregate."""
    description: str | None = None
    rir_id: UUID | None = None


class AggregateResponse(AggregateBase):
    """Schema for aggregate response."""
    id: UUID
    tenant_id: UUID
    family: int = 4
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AggregateUsageResponse(BaseModel):
    """Schema for aggregate usage (derived from child prefixes)."""
    aggregate_id: UUID
    network: str
    total_ips: int
    used_ips: int
    utilization_pct: float
