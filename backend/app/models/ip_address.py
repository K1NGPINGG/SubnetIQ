"""IP Address model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.approval import ApprovalRequest
    from app.models.ip_address import VIPNodeBinding
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

    # Virtual IP (VIP) inventory
    is_vip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vip_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

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
    # VIP -> backing node IPs (1:N). A VIP is the ``vip`` side; the underlying
    # physical/virtual host records are the ``node_ip`` side.
    vip_bindings: Mapped[list["VIPNodeBinding"]] = relationship(
        back_populates="vip",
        cascade="all, delete-orphan",
        foreign_keys="VIPNodeBinding.vip_id",
    )
    # A regular IP can act as a backing node for one or more VIPs.
    node_bindings_as_node: Mapped[list["VIPNodeBinding"]] = relationship(
        back_populates="node_ip",
        cascade="all, delete-orphan",
        foreign_keys="VIPNodeBinding.node_ip_id",
    )

    def __repr__(self) -> str:
        return f"<IPAddress(id={self.id}, address={self.address}, status={self.status})>"


class VIPNodeBinding(Base, UUIDPrimaryKeyMixin):
    """Association between a Virtual IP and one of its backing node IPs (1:N)."""

    __tablename__ = "vip_node_bindings"

    vip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ip_addresses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    node_ip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ip_addresses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # e.g. "primary", "backup", "active", "standby"
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)

    vip: Mapped["IPAddress"] = relationship(
        back_populates="vip_bindings",
        foreign_keys=[vip_id],
    )
    node_ip: Mapped["IPAddress"] = relationship(
        back_populates="node_bindings_as_node",
        foreign_keys=[node_ip_id],
    )

    @property
    def node_ip_address(self) -> str | None:
        return self.node_ip.address if self.node_ip else None
