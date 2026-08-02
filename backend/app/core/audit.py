"""Audit logging utility."""

import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.audit import AuditLog


async def log_audit(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    ip_address: str | None = None,
    user_email: str | None = None,
    user_name: str | None = None,
):
    """Create an audit log entry."""
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_email=user_email,
        user_name=user_name,
    )
    db.add(entry)

    # Fire webhook notifications asynchronously without blocking the request.
    # The dispatch runs in its own session so it never shares (and races) the
    # request's DB session.
    try:
        event_data = {
            "entity_id": str(entity_id) if entity_id else None,
            "old_value": old_value,
            "new_value": new_value,
            "user_email": user_email,
            "user_name": user_name,
            "ip_address": ip_address,
        }
        asyncio.get_running_loop().create_task(
            _dispatch_webhooks_in_own_session(
                tenant_id,
                entity_type,
                action,
                event_data,
            )
        )
    except Exception:  # noqa: BLE001
        # Never let webhook dispatch break the audit path.
        pass


async def _dispatch_webhooks_in_own_session(
    tenant_id: UUID,
    entity_type: str,
    action: str,
    event_data: dict,
):
    """Dispatch webhooks using a dedicated session to avoid session races."""
    try:
        from app.core.webhooks import dispatch_webhooks

        async with async_session_factory() as session:
            await dispatch_webhooks(
                session,
                tenant_id,
                entity_type,
                action,
                event_data,
                commit=True,
            )
    except Exception:  # noqa: BLE001
        # Never let webhook dispatch break the audit path.
        pass
