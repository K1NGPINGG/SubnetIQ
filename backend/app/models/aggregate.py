"""Aggregate model — the root of the IP hierarchy."""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.rir import RIR
    from app.models.tenant import Tenant


class Aggregate(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a large allocation of address space (typically per-RIR).

    Aggregates sit at the root of the IP hierarchy. Their utilization is
    derived from the child prefixes they contain.
    """

    __tablename__ = "aggregates"

    network_address: Mapped[str] = mapped_column(String(45), nullable=False)
    prefix_length: Mapped[int] = mapped_column(Integer, nullable=False)
    family: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Optional RIR association
    rir_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rirs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="aggregates")
    rir: Mapped[Optional["RIR"]] = relationship(back_populates="aggregates")

    def __repr__(self) -> str:
        return f"<Aggregate(id={self.id}, network={self.network_address}/{self.prefix_length})>"
