"""Webhook management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.core.rbac import require_permission
from app.models.user import User
from app.models.webhook import Webhook
from app.schemas.webhook import WebhookCreate, WebhookResponse, WebhookUpdate

router = APIRouter()


@router.get("", response_model=list[WebhookResponse], summary="List webhooks")
async def list_webhooks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Webhook)
        .where(Webhook.tenant_id == tenant_id)
        .order_by(Webhook.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [WebhookResponse.model_validate(h) for h in result.scalars().all()]


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED, summary="Create webhook")
async def create_webhook(
    request: Request,
    webhook_in: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("webhook", "create")),
):
    webhook = Webhook(tenant_id=tenant_id, **webhook_in.model_dump())
    db.add(webhook)
    await db.flush()
    await db.refresh(webhook)

    await log_audit(db, tenant_id, current_user.id, "create", "webhook", str(webhook.id),
                    new_value=webhook.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return WebhookResponse.model_validate(webhook)


@router.get("/{webhook_id}", response_model=WebhookResponse, summary="Get webhook by ID")
async def get_webhook(
    webhook_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.tenant_id == tenant_id)
    )
    webhook = result.scalar_one_or_none()
    if webhook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return WebhookResponse.model_validate(webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse, summary="Update webhook")
async def update_webhook(
    request: Request,
    webhook_id: UUID,
    webhook_in: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("webhook", "update")),
):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.tenant_id == tenant_id)
    )
    webhook = result.scalar_one_or_none()
    if webhook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    update_data = webhook_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(webhook, field, value)

    db.add(webhook)
    await db.flush()
    await db.refresh(webhook)

    await log_audit(db, tenant_id, current_user.id, "update", "webhook", str(webhook.id),
                    new_value=webhook.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return WebhookResponse.model_validate(webhook)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete webhook")
async def delete_webhook(
    request: Request,
    webhook_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("webhook", "delete")),
):
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.tenant_id == tenant_id)
    )
    webhook = result.scalar_one_or_none()
    if webhook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "webhook", str(webhook_id),
                    old_value=webhook.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(webhook)
    await db.flush()
