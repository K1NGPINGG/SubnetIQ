"""IP Address model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.approval import ApprovalRequest
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant
    from app.models.vrf import VRF


class IPAddress(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents an individual IP address assignment."""

    __tablename__ = "ip_addresses"

    address: Mapped[str] = mapped_column(String(45), nullable=False)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="available")
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    allocated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Address family: 4 for IPv4, 6 for IPv6
    family: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    # Tags and custom field values (JSONB)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    custom_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Subnet association
    subnet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subnets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional VRF association
    vrf_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vrfs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="ip_addresses")
    subnet: Mapped["Subnet"] = relationship(back_populates="ip_addresses")
    vrf: Mapped[Optional["VRF"]] = relationship(back_populates="ip_addresses")
    approval_requests: Mapped[list["ApprovalRequest"]] = relationship(
        back_populates="ip_address",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<IPAddress(id={self.id}, address={self.address}, status={self.status})>"
