"""Subnet model."""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.discovery import DiscoveryScan
    from app.models.ip_address import IPAddress
    from app.models.ip_range import IPRange
    from app.models.site import Site
    from app.models.tenant import Tenant
    from app.models.vlan import VLAN
    from app.models.vrf import VRF


class Subnet(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents an IP subnet/prefix."""

    __tablename__ = "subnets"

    network_address: Mapped[str] = mapped_column(String(45), nullable=False)
    prefix_length: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    gateway: Mapped[str | None] = mapped_column(String(45), nullable=True)
    dns_servers: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Address family: 4 for IPv4, 6 for IPv6
    family: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    # Functional role and operational status (NetBox-style)
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )
    is_container: Mapped[bool] = mapped_column(
        default=False, nullable=False, comment="Container prefix housing child prefixes"
    )

    # Tags and custom field values (JSONB)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    custom_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Optional associations
    vrf_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vrfs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vlan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vlans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_subnet_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subnets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="subnets")
    vrf: Mapped[Optional["VRF"]] = relationship(back_populates="subnets")
    site: Mapped[Optional["Site"]] = relationship(back_populates="subnets")
    vlan: Mapped[Optional["VLAN"]] = relationship(back_populates="subnets")
    parent_subnet: Mapped[Optional["Subnet"]] = relationship(
        remote_side="Subnet.id",
        backref="child_subnets",
    )
    ip_addresses: Mapped[list["IPAddress"]] = relationship(back_populates="subnet")
    ip_ranges: Mapped[list["IPRange"]] = relationship(
        back_populates="subnet", cascade="all, delete-orphan"
    )
    discovery_scans: Mapped[list["DiscoveryScan"]] = relationship(back_populates="subnet")

    def __repr__(self) -> str:
        return f"<Subnet(id={self.id}, network={self.network_address}/{self.prefix_length}, name={self.name})>"
