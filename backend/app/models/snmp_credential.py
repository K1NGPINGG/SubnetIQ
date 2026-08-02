"""SNMP Credential model for network discovery."""


from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.core.encryption import decrypt_value, encrypt_value
from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


def _encrypt_if_plain(value: str | None) -> str | None:
    """Encrypt a value if it's not already encrypted."""
    if value and not value.startswith("gAAAAA"):
        return encrypt_value(value)
    return value


def _decrypt_safe(value: str | None) -> str | None:
    """Decrypt a value, returning None on failure."""
    if not value:
        return value
    try:
        return decrypt_value(value)
    except Exception:
        return value


class SNMPCredential(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """SNMP credential profile for network discovery scanning."""

    __tablename__ = "snmp_credentials"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(10), nullable=False, default="v2c")

    # v1/v2c — encrypted
    _community_string: Mapped[str | None] = mapped_column("community_string", String(500), nullable=True)

    # v3 fields — encrypted
    _v3_username: Mapped[str | None] = mapped_column("v3_username", String(500), nullable=True)
    v3_auth_protocol: Mapped[str | None] = mapped_column(String(10), nullable=True)
    _v3_auth_passphrase: Mapped[str | None] = mapped_column("v3_auth_passphrase", String(500), nullable=True)
    v3_priv_protocol: Mapped[str | None] = mapped_column(String(10), nullable=True)
    _v3_priv_passphrase: Mapped[str | None] = mapped_column("v3_priv_passphrase", String(500), nullable=True)
    v3_security_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates=None)

    # --- community_string ---
    @property
    def community_string(self) -> str | None:
        return _decrypt_safe(self._community_string)

    @community_string.setter
    def community_string(self, value: str | None):
        self._community_string = _encrypt_if_plain(value)

    @validates("community_string")
    def _validate_community_string(self, key, value):
        return _encrypt_if_plain(value)

    # --- v3_username ---
    @property
    def v3_username(self) -> str | None:
        return _decrypt_safe(self._v3_username)

    @v3_username.setter
    def v3_username(self, value: str | None):
        self._v3_username = _encrypt_if_plain(value)

    # --- v3_auth_passphrase ---
    @property
    def v3_auth_passphrase(self) -> str | None:
        return _decrypt_safe(self._v3_auth_passphrase)

    @v3_auth_passphrase.setter
    def v3_auth_passphrase(self, value: str | None):
        self._v3_auth_passphrase = _encrypt_if_plain(value)

    # --- v3_priv_passphrase ---
    @property
    def v3_priv_passphrase(self) -> str | None:
        return _decrypt_safe(self._v3_priv_passphrase)

    @v3_priv_passphrase.setter
    def v3_priv_passphrase(self, value: str | None):
        self._v3_priv_passphrase = _encrypt_if_plain(value)

    def __repr__(self) -> str:
        return f"<SNMPCredential(id={self.id}, name={self.name}, version={self.version})>"
