"""Asset / Discovered Device model."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a discovered network asset / device."""

    __tablename__ = "assets"

    ip_address: Mapped[str] = mapped_column(
        String(45), nullable=False, index=True, unique=True
    )
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="Unknown"
    )
    discovery_source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PING"
    )
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cpu_cores: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ram_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Online"
    )
    last_scanned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raw_scan_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    network_interfaces: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, ip={self.ip_address}, source={self.discovery_source})>"
