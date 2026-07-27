"""WinRM Credential model for Windows discovery."""

import uuid
from typing import Optional

from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin
from app.core.encryption import encrypt_value, decrypt_value


class WinRMCredential(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """WinRM credential profile for Windows server discovery."""

    __tablename__ = "winrm_credentials"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    _password: Mapped[str] = mapped_column("password", String(500), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=5985)
    use_ssl: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auth_type: Mapped[str] = mapped_column(String(20), nullable=False, default="basic")
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def password(self) -> str:
        """Decrypt password on read."""
        try:
            return decrypt_value(self._password)
        except Exception:
            return self._password

    @password.setter
    def password(self, value: str):
        """Encrypt password on write (skip if already encrypted)."""
        if value and not value.startswith("gAAAAA"):
            self._password = encrypt_value(value)
        else:
            self._password = value

    @validates("password")
    def _validate_password(self, key, value):
        """Encrypt password via validates decorator as backup."""
        if value and not value.startswith("gAAAAA"):
            return encrypt_value(value)
        return value

    def __repr__(self) -> str:
        return f"<WinRMCredential(id={self.id}, name={self.name}, username={self.username})>"
