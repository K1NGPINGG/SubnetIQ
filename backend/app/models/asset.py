"""Asset / Discovered Device model."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Float, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a discovered network asset / device."""

    __tablename__ = "assets"

    ip_address: Mapped[str] = mapped_column(
        String(45), nullable=False, index=True, unique=True
    )
    mac_address: Mapped[Optional[str]] = mapped_column(String(17), nullable=True)
    hostname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default="Unknown"
    )
    discovery_source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PING"
    )
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    os_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    os_version: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cpu_cores: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ram_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Online"
    )
    last_scanned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raw_scan_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    network_interfaces: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, ip={self.ip_address}, source={self.discovery_source})>"
