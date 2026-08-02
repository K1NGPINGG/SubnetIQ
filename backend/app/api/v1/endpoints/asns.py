"""ASN management endpoints with tenant scoping."""

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
from app.models.asn import ASN
from app.models.user import User
from app.schemas.asn import ASNCreate, ASNResponse, ASNUpdate

router = APIRouter()


@router.get("", response_model=list[ASNResponse], summary="List ASNs")
async def list_asns(
    response: Response,
    site_id: UUID | None = Query(None, description="Filter by site"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(ASN).where(ASN.tenant_id == tenant_id)
    if site_id:
        query = query.where(ASN.site_id == site_id)
    query = query.order_by(ASN.asn)
    rows, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [ASNResponse.model_validate(row) for row in rows]


@router.post("", response_model=ASNResponse, status_code=status.HTTP_201_CREATED, summary="Create ASN")
async def create_asn(
    request: Request,
    asn_in: ASNCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('asn', 'create')),
):
    if not (1 <= asn_in.asn <= 4294967295):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ASN must be between 1 and 4294967295",
        )

    existing = await db.execute(
        select(ASN).where(ASN.tenant_id == tenant_id, ASN.asn == asn_in.asn)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ASN already exists in your tenant",
        )

    is_32bit = asn_in.asn > 65535
    asn_obj = ASN(
        tenant_id=tenant_id,
        asn=asn_in.asn,
        description=asn_in.description,
        rir_id=asn_in.rir_id,
        site_id=asn_in.site_id,
        is_32bit=is_32bit,
    )
    db.add(asn_obj)
    await db.flush()
    await db.refresh(asn_obj)

    await log_audit(db, tenant_id, current_user.id, "create", "asn", str(asn_obj.id),
                    new_value=str(asn_obj.asn), user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return ASNResponse.model_validate(asn_obj)


@router.get("/{asn_id}", response_model=ASNResponse, summary="Get ASN by ID")
async def get_asn(
    asn_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ASN).where(ASN.id == asn_id, ASN.tenant_id == tenant_id)
    )
    asn_obj = result.scalar_one_or_none()
    if asn_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ASN not found")
    return ASNResponse.model_validate(asn_obj)


@router.put("/{asn_id}", response_model=ASNResponse, summary="Update ASN")
async def update_asn(
    request: Request,
    asn_id: UUID,
    asn_in: ASNUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('asn', 'update')),
):
    result = await db.execute(
        select(ASN).where(ASN.id == asn_id, ASN.tenant_id == tenant_id)
    )
    asn_obj = result.scalar_one_or_none()
    if asn_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ASN not found")

    update_data = asn_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asn_obj, field, value)

    db.add(asn_obj)
    await db.flush()
    await db.refresh(asn_obj)

    await log_audit(db, tenant_id, current_user.id, "update", "asn", str(asn_obj.id),
                    new_value=str(asn_obj.asn), user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return ASNResponse.model_validate(asn_obj)


@router.delete("/{asn_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete ASN")
async def delete_asn(
    request: Request,
    asn_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('asn', 'delete')),
):
    result = await db.execute(
        select(ASN).where(ASN.id == asn_id, ASN.tenant_id == tenant_id)
    )
    asn_obj = result.scalar_one_or_none()
    if asn_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ASN not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "asn", str(asn_id),
                    old_value=str(asn_obj.asn), user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(asn_obj)
    await db.flush()
