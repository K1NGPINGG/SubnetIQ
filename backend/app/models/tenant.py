"""Tenant model."""


from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.aggregate import Aggregate
    from app.models.asn import ASN
    from app.models.ip_address import IPAddress
    from app.models.ip_range import IPRange
    from app.models.site import Site
    from app.models.subnet import Subnet
    from app.models.user import User
    from app.models.vlan import VLAN
    from app.models.vrf import VRF


class Tenant(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a tenant (organization) in the multi-tenant system."""

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True, default="#1976D2")
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    sites: Mapped[list["Site"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    vlans: Mapped[list["VLAN"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    vrfs: Mapped[list["VRF"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    subnets: Mapped[list["Subnet"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    ip_addresses: Mapped[list["IPAddress"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    ip_ranges: Mapped[list["IPRange"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    aggregates: Mapped[list["Aggregate"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    asns: Mapped[list["ASN"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Tenant(id={self.id}, name={self.name})>"
