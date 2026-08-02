"""Webhook model — outgoing HTTP notifications for audit events."""


from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Webhook(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents an outgoing webhook subscription.

    ``events`` is a JSON list of event patterns like
    ["subnet.create", "subnet.delete", "ip_address.update"]. An empty list
    subscribes to all events.
    """

    __tablename__ = "webhooks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    http_method: Mapped[str] = mapped_column(String(10), nullable=False, default="POST")
    secret: Mapped[str | None] = mapped_column(String(500), nullable=True)
    events: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    headers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ssl_verify: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    timeout: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Webhook(id={self.id}, name={self.name}, url={self.url})>"
