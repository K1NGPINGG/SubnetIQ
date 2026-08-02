"""System logging utility for operational and background logs."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_log import SystemLog


async def log_system(
    db: AsyncSession,
    level: str,
    category: str,
    message: str,
    details: str | None = None,
    source: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    task_id: str | None = None,
    duration_ms: int | None = None,
    ip_address: str | None = None,
    user_id: str | None = None,
    tenant_id: UUID | None = None,
):
    """Create a system log entry."""
    entry = SystemLog(
        level=level,
        category=category,
        message=message,
        details=details,
        source=source,
        entity_type=entity_type,
        entity_id=entity_id,
        task_id=task_id,
        duration_ms=duration_ms,
        ip_address=ip_address,
        user_id=user_id,
        tenant_id=tenant_id,
    )
    db.add(entry)
