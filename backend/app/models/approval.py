"""IP release / allocation approval request model.

Provides an approval queue so that sensitive IP lifecycle changes
(release, forced re-allocation) require a privileged user to approve
them before they take effect.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.ip_address import IPAddress


class ApprovalRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a pending approval for an IP lifecycle change."""

    __tablename__ = "approval_requests"

    request_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="release"
    )  # "release" | "reallocate"
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # "pending" | "approved" | "rejected"
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ip_addresses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    decision_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address: Mapped["IPAddress"] = relationship(back_populates="approval_requests")

    def __repr__(self) -> str:
        return (
            f"<ApprovalRequest(id={self.id}, type={self.request_type}, "
            f"status={self.status})>"
        )
