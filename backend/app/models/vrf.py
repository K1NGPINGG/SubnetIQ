"""VRF model — virtual routing and forwarding instances."""


from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.ip_address import IPAddress
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant


class VRF(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a virtual routing and forwarding (VRF) instance.

    VRFs model discrete routing tables, allowing overlapping address space
    to coexist when assigned to different VRFs. ``enforce_unique`` controls
    whether duplicate IP/prefix objects are rejected within this VRF.
    """

    __tablename__ = "vrfs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rd: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enforce_unique: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="vrfs")
    subnets: Mapped[list["Subnet"] | None] = relationship(back_populates="vrf")
    ip_addresses: Mapped[list["IPAddress"] | None] = relationship(back_populates="vrf")

    def __repr__(self) -> str:
        return f"<VRF(id={self.id}, name={self.name}, rd={self.rd})>"
