"""Tag model and polymorphic tag association table."""


from sqlalchemy import Column, ForeignKey, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

# Polymorphic association between tags and any tennant-scoped object
tag_associations = Table(
    "tag_associations",
    Base.metadata,
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "entity_type",
        String(100),
        nullable=False,
        primary_key=True,
    ),
    Column(
        "entity_id",
        UUID(as_uuid=True),
        nullable=False,
        primary_key=True,
    ),
    Column(
        "tenant_id",
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
)


class Tag(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a label that can be applied to any object."""

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#1976D2")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Tag(id={self.id}, name={self.name})>"
