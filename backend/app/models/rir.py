"""RIR (Regional Internet Registry) model."""


from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.aggregate import Aggregate


class RIR(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a regional internet registry (e.g. ARIN, RIPE, APNIC)."""

    __tablename__ = "rirs"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    aggregates: Mapped[list["Aggregate"]] = relationship(back_populates="rir")

    def __repr__(self) -> str:
        return f"<RIR(id={self.id}, name={self.name})>"
