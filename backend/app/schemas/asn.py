"""ASN schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ASNBase(BaseModel):
    """Base ASN schema."""
    asn: int
    description: str | None = None
    rir_id: UUID | None = None
    site_id: UUID | None = None


class ASNCreate(ASNBase):
    """Schema for creating an ASN."""
    @classmethod
    def validate_asn(cls, v: int) -> int:
        if not (1 <= v <= 4294967295):
            raise ValueError("ASN must be between 1 and 4294967295")
        return v


class ASNUpdate(BaseModel):
    """Schema for updating an ASN."""
    description: str | None = None
    rir_id: UUID | None = None
    site_id: UUID | None = None


class ASNResponse(ASNBase):
    """Schema for ASN response."""
    id: UUID
    tenant_id: UUID
    is_32bit: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
