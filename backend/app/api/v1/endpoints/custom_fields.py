"""Custom field management endpoints."""

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
from app.core.validation import _VALID_FIELD_TYPES
from app.models.custom_field import CustomField
from app.models.user import User
from app.schemas.custom_field import CustomFieldCreate, CustomFieldResponse, CustomFieldUpdate

router = APIRouter()


@router.get("", response_model=list[CustomFieldResponse], summary="List custom fields")
async def list_custom_fields(
    response: Response,
    entity_type: str | None = Query(None, description="Filter by applicable entity type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(CustomField).order_by(CustomField.weight, CustomField.name)
    if entity_type:
        result = await db.execute(select(CustomField))
        fields = [f for f in result.scalars().all()
                  if entity_type in [part.strip() for part in (f.applies_to or "").split(",")]]
        set_pagination_headers(response, len(fields), skip, limit)
        return [CustomFieldResponse.model_validate(f) for f in fields]
    fields, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [CustomFieldResponse.model_validate(f) for f in fields]


@router.post("", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED, summary="Create custom field")
async def create_custom_field(
    request: Request,
    field_in: CustomFieldCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('custom_field', 'create')),
):
    if field_in.field_type not in _VALID_FIELD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"field_type must be one of: {', '.join(sorted(_VALID_FIELD_TYPES))}",
        )
    if field_in.field_type == "select" and not field_in.choices:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="choices are required for 'select' fields",
        )

    existing = await db.execute(select(CustomField).where(CustomField.name == field_in.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A custom field with this name already exists",
        )

    field = CustomField(**field_in.model_dump())
    db.add(field)
    await db.flush()
    await db.refresh(field)

    await log_audit(db, tenant_id, current_user.id, "create", "custom_field", str(field.id),
                    new_value=field.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return CustomFieldResponse.model_validate(field)


@router.get("/{field_id}", response_model=CustomFieldResponse, summary="Get custom field by ID")
async def get_custom_field(
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(CustomField).where(CustomField.id == field_id))
    field = result.scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found")
    return CustomFieldResponse.model_validate(field)


@router.put("/{field_id}", response_model=CustomFieldResponse, summary="Update custom field")
async def update_custom_field(
    request: Request,
    field_id: UUID,
    field_in: CustomFieldUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('custom_field', 'update')),
):
    result = await db.execute(select(CustomField).where(CustomField.id == field_id))
    field = result.scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found")

    update_data = field_in.model_dump(exclude_unset=True)
    if "field_type" in update_data and update_data["field_type"] not in _VALID_FIELD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"field_type must be one of: {', '.join(sorted(_VALID_FIELD_TYPES))}",
        )
    if "choices" in update_data and update_data.get("choices") is not None \
            and not update_data["choices"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="choices cannot be empty for a select field",
        )

    for field_name, value in update_data.items():
        setattr(field, field_name, value)

    db.add(field)
    await db.flush()
    await db.refresh(field)

    await log_audit(db, tenant_id, current_user.id, "update", "custom_field", str(field.id),
                    new_value=field.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return CustomFieldResponse.model_validate(field)


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete custom field")
async def delete_custom_field(
    request: Request,
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('custom_field', 'delete')),
):
    result = await db.execute(select(CustomField).where(CustomField.id == field_id))
    field = result.scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "custom_field", str(field_id),
                    old_value=field.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(field)
    await db.flush()
