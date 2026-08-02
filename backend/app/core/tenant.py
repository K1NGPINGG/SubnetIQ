"""Tenant context utilities for multi-tenant request handling."""

import contextvars
from uuid import UUID

# Context variable to store the current tenant ID per-request
current_tenant_id: contextvars.ContextVar[UUID | None] = contextvars.ContextVar(
    "current_tenant_id", default=None
)


def get_current_tenant_id() -> UUID | None:
    """Get the current tenant ID from the context variable."""
    return current_tenant_id.get()


def set_current_tenant_id(tenant_id: UUID) -> None:
    """Set the current tenant ID in the context variable."""
    current_tenant_id.set(tenant_id)


def reset_current_tenant_id() -> None:
    """Reset the current tenant ID."""
    current_tenant_id.set(None)
