"""Audit log endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access, get_current_admin_user
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()


@router.get("", summary="List audit logs")
async def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    action: Optional[str] = Query(None, description="Filter by action"),
    user_id: Optional[UUID] = Query(None, description="Filter by user"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """List audit logs for the current tenant (admin only)."""
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    # Get total count
    count_query = select(func.count(AuditLog.id)).where(AuditLog.tenant_id == tenant_id)
    if entity_type:
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if action:
        count_query = count_query.where(AuditLog.action == action)
    if user_id:
        count_query = count_query.where(AuditLog.user_id == user_id)
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "total": total,
        "logs": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "user_email": getattr(log, "user_email", None),
                "user_name": getattr(log, "user_name", None),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


@router.get("/entity-types", summary="Get distinct entity types")
async def get_entity_types(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Get distinct entity types from audit logs."""
    result = await db.execute(
        select(AuditLog.entity_type)
        .where(AuditLog.tenant_id == tenant_id)
        .distinct()
    )
    return [row[0] for row in result.all()]


@router.get("/actions", summary="Get distinct actions")
async def get_actions(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Get distinct actions from audit logs."""
    result = await db.execute(
        select(AuditLog.action)
        .where(AuditLog.tenant_id == tenant_id)
        .distinct()
    )
    return [row[0] for row in result.all()]
