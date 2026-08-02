"""Approval workflow schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ApprovalRequestCreate(BaseModel):
    """Schema for creating an approval request."""
    request_type: str = "release"
    reason: str | None = None


class ApprovalDecision(BaseModel):
    """Schema for approving/rejecting an approval request."""
    notes: str | None = None


class ApprovalRequestResponse(BaseModel):
    """Schema for approval request response."""
    id: UUID
    tenant_id: UUID
    request_type: str
    status: str
    reason: str | None = None
    ip_address_id: UUID
    requested_by: UUID
    approved_by: UUID | None = None
    decision_at: datetime | None = None
    decision_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
