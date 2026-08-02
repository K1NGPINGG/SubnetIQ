"""Custom Validation Rule model — JSON-schema based create/update/deletion guards."""


from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CustomValidationRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Defines validation constraints for an entity type.

    ``entity_type`` is e.g. "subnet" or "ip_address". ``condition`` is a
    JSON object describing when the rule applies (e.g. {"status": "active"}),
    and ``error_message`` is shown when the rule fails. ``enforce_on_delete``
    rules protect objects from deletion when the condition matches.
    """

    __tablename__ = "custom_validation_rules"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    condition: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enforce_on_delete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    weight: Mapped[int] = mapped_column(nullable=False, default=100)

    def __repr__(self) -> str:
        return f"<CustomValidationRule(id={self.id}, name={self.name}, entity={self.entity_type})>"
