"""Custom validation rule management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.models.custom_validation import CustomValidationRule
from app.models.user import User
from app.schemas.custom_validation import (
    CustomValidationRuleCreate,
    CustomValidationRuleResponse,
    CustomValidationRuleUpdate,
)

router = APIRouter()


@router.get("", response_model=list[CustomValidationRuleResponse], summary="List validation rules")
async def list_rules(
    response: Response,
    entity_type: str | None = Query(None, description="Filter by entity type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(CustomValidationRule).order_by(CustomValidationRule.weight)
    if entity_type:
        query = query.where(CustomValidationRule.entity_type == entity_type)
    rules, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [CustomValidationRuleResponse.model_validate(r) for r in rules]


@router.post("", response_model=CustomValidationRuleResponse, status_code=status.HTTP_201_CREATED, summary="Create validation rule")
async def create_rule(
    request: Request,
    rule_in: CustomValidationRuleCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('validation_rule', 'create')),
):
    existing = await db.execute(
        select(CustomValidationRule).where(CustomValidationRule.name == rule_in.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A validation rule with this name already exists",
        )

    rule = CustomValidationRule(**rule_in.model_dump())
    db.add(rule)
    await db.flush()
    await db.refresh(rule)

    await log_audit(db, tenant_id, current_user.id, "create", "custom_validation_rule", str(rule.id),
                    new_value=rule.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return CustomValidationRuleResponse.model_validate(rule)


@router.get("/{rule_id}", response_model=CustomValidationRuleResponse, summary="Get validation rule by ID")
async def get_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(CustomValidationRule).where(CustomValidationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Validation rule not found")
    return CustomValidationRuleResponse.model_validate(rule)


@router.put("/{rule_id}", response_model=CustomValidationRuleResponse, summary="Update validation rule")
async def update_rule(
    request: Request,
    rule_id: UUID,
    rule_in: CustomValidationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('validation_rule', 'update')),
):
    result = await db.execute(select(CustomValidationRule).where(CustomValidationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Validation rule not found")

    update_data = rule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    db.add(rule)
    await db.flush()
    await db.refresh(rule)

    await log_audit(db, tenant_id, current_user.id, "update", "custom_validation_rule", str(rule.id),
                    new_value=rule.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return CustomValidationRuleResponse.model_validate(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete validation rule")
async def delete_rule(
    request: Request,
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('validation_rule', 'delete')),
):
    result = await db.execute(select(CustomValidationRule).where(CustomValidationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Validation rule not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "custom_validation_rule", str(rule_id),
                    old_value=rule.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(rule)
    await db.flush()
