"""Site model."""


from typing import TYPE_CHECKING

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.asn import ASN
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant
    from app.models.vlan import VLAN


class Site(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a physical site/office location."""

    __tablename__ = "sites"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="sites")
    subnets: Mapped[list["Subnet"]] = relationship(back_populates="site")
    vlans: Mapped[list["VLAN"]] = relationship(back_populates="site")
    asns: Mapped[list["ASN"]] = relationship(back_populates="site")

    def __repr__(self) -> str:
        return f"<Site(id={self.id}, name={self.name}, code={self.code})>"
