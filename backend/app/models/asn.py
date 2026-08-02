"""ASN (Autonomous System Number) model."""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.rir import RIR
    from app.models.site import Site
    from app.models.tenant import Tenant


class ASN(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents an autonomous system number and its assignment to a site."""

    __tablename__ = "asns"

    asn: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 16-bit (1-65535) or 32-bit (1-4294967295) ASN
    is_32bit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    rir_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rirs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="asns")
    rir: Mapped[Optional["RIR"]] = relationship()
    site: Mapped[Optional["Site"]] = relationship(back_populates="asns")

    def __repr__(self) -> str:
        return f"<ASN(id={self.id}, asn={self.asn})>"
