"""System logs endpoint for viewing operational and background logs."""

from uuid import UUIDfrom fastapi import APIRouter, Depends, Queryfrom sqlalchemy import func, selectfrom sqlalchemy.ext.asyncio import AsyncSessionfrom app.api.deps import get_current_active_user, validate_tenant_accessfrom app.core.database import get_dbfrom app.models.system_log import SystemLogfrom app.models.user import Userrouter = APIRouter()


@router.get("", summary="List system logs")
async def list_system_logs(
    level: str | None = Query(None, description="Filter by level: info, warning, error, critical"),
    category: str | None = Query(None, description="Filter by category: api, task, system, discovery, auth"),
    source: str | None = Query(None, description="Filter by source"),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    search: str | None = Query(None, description="Search in message"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """List system logs with filtering and search."""
    query = select(SystemLog).where(SystemLog.tenant_id == tenant_id)

    if level:
        query = query.where(SystemLog.level == level)
    if category:
        query = query.where(SystemLog.category == category)
    if source:
        query = query.where(SystemLog.source == source)
    if entity_type:
        query = query.where(SystemLog.entity_type == entity_type)
    if search:
        query = query.where(SystemLog.message.ilike(f"%{search}%"))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(SystemLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "level": log.level,
                "category": log.category,
                "message": log.message,
                "details": log.details,
                "source": log.source,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "task_id": log.task_id,
                "duration_ms": log.duration_ms,
                "ip_address": log.ip_address,
                "user_id": log.user_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
    }


@router.get("/levels", response_model=list[str], summary="Get available log levels")
async def get_log_levels(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get distinct log levels that exist in the system."""
    query = select(SystemLog.level).where(
        SystemLog.tenant_id == tenant_id
    ).distinct()
    result = await db.execute(query)
    return [row[0] for row in result.all()]


@router.get("/categories", response_model=list[str], summary="Get available log categories")
async def get_log_categories(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get distinct log categories that exist in the system."""
    query = select(SystemLog.category).where(
        SystemLog.tenant_id == tenant_id
    ).distinct()
    result = await db.execute(query)
    return [row[0] for row in result.all()]


@router.get("/sources", response_model=list[str], summary="Get available log sources")
async def get_log_sources(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get distinct log sources that exist in the system."""
    query = select(SystemLog.source).where(
        SystemLog.tenant_id == tenant_id,
        SystemLog.source.isnot(None),
    ).distinct()
    result = await db.execute(query)
    return [row[0] for row in result.all()]
