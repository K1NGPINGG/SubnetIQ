"""User model."""


from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.audit import AuditLog
    from app.models.tenant import Tenant


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Represents a user within a tenant."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # MFA fields
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mfa_enforced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Azure AD
    azure_ad_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)

    # LDAP
    ldap_dn: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
