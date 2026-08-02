"""VLAN model."""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.site import Site
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant


class VLAN(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a VLAN (Virtual LAN)."""

    __tablename__ = "vlans"

    vlan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Optional site association
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="vlans")
    site: Mapped[Optional["Site"]] = relationship(back_populates="vlans")
    subnets: Mapped[list["Subnet"]] = relationship(back_populates="vlan")

    def __repr__(self) -> str:
        return f"<VLAN(id={self.id}, vlan_id={self.vlan_id}, name={self.name})>"
