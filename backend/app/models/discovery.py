"""Discovery Scan model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant


class DiscoveryScan(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a network discovery scan."""

    __tablename__ = "discovery_scans"

    subnet_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subnets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    scan_type: Mapped[str] = mapped_column(String(50), nullable=False, default="icmp")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scheduled scan fields
    is_scheduled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    schedule_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_recursive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates=None)
    subnet: Mapped["Subnet"] = relationship(back_populates="discovery_scans")

    def __repr__(self) -> str:
        return f"<DiscoveryScan(id={self.id}, type={self.scan_type}, status={self.status})>"
