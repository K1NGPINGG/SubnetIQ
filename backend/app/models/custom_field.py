"""Custom Field model — user-defined fields attached to objects (NetBox-style)."""


from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CustomField(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a user-defined field applicable to a set of object types.

    ``applies_to`` is a comma-separated list of entity types (e.g.
    "subnet,ip_address,site"). ``field_type`` is one of text, integer,
    float, boolean, date, or select.
    """

    __tablename__ = "custom_fields"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    applies_to: Mapped[str] = mapped_column(String(500), nullable=False)
    field_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    choices: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[int] = mapped_column(nullable=False, default=100)

    def __repr__(self) -> str:
        return f"<CustomField(id={self.id}, name={self.name}, type={self.field_type})>"
