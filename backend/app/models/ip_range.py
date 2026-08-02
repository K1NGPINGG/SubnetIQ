"""IP Range model — arbitrary range of addresses within a prefix (e.g. DHCP scope)."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.subnet import Subnet
    from app.models.tenant import Tenant


class IPRange(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents an arbitrary range of IP addresses within a prefix.

    Ranges share the same mask as their parent prefix and are commonly
    associated with DHCP scopes or pools.
    """

    __tablename__ = "ip_ranges"

    start_address: Mapped[str] = mapped_column(String(45), nullable=False)
    end_address: Mapped[str] = mapped_column(String(45), nullable=False)
    family: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    subnet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subnets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="ip_ranges")
    subnet: Mapped["Subnet"] = relationship(back_populates="ip_ranges")

    def __repr__(self) -> str:
        return f"<IPRange(id={self.id}, {self.start_address}-{self.end_address})>"
