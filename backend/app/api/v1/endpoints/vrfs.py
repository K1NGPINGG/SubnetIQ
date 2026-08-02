"""VRF management endpoints with tenant scoping."""

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
from app.models.user import User
from app.models.vrf import VRF
from app.schemas.vrf import VRFCreate, VRFResponse, VRFUpdate

router = APIRouter()


@router.get("", response_model=list[VRFResponse], summary="List VRFs")
async def list_vrfs(
    response: Response,
    search: str | None = Query(None, description="Search by name or RD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(VRF).where(VRF.tenant_id == tenant_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (VRF.name.ilike(search_pattern)) | (VRF.rd.ilike(search_pattern))
        )
    query = query.order_by(VRF.name)
    vrfs, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [VRFResponse.model_validate(v) for v in vrfs]


@router.post("", response_model=VRFResponse, status_code=status.HTTP_201_CREATED, summary="Create VRF")
async def create_vrf(
    request: Request,
    vrf_in: VRFCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("vrf", "create")),
):
    existing = await db.execute(
        select(VRF).where(
            VRF.tenant_id == tenant_id,
            (VRF.name == vrf_in.name) | (VRF.rd == vrf_in.rd),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="VRF with this name or RD already exists in your tenant",
        )

    vrf = VRF(tenant_id=tenant_id, **vrf_in.model_dump())
    db.add(vrf)
    await db.flush()
    await db.refresh(vrf)

    await log_audit(db, tenant_id, current_user.id, "create", "vrf", str(vrf.id),
                    new_value=vrf.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return VRFResponse.model_validate(vrf)


@router.get("/{vrf_id}", response_model=VRFResponse, summary="Get VRF by ID")
async def get_vrf(
    vrf_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(VRF).where(VRF.id == vrf_id, VRF.tenant_id == tenant_id)
    )
    vrf = result.scalar_one_or_none()
    if vrf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VRF not found")
    return VRFResponse.model_validate(vrf)


@router.put("/{vrf_id}", response_model=VRFResponse, summary="Update VRF")
async def update_vrf(
    request: Request,
    vrf_id: UUID,
    vrf_in: VRFUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("vrf", "update")),
):
    result = await db.execute(
        select(VRF).where(VRF.id == vrf_id, VRF.tenant_id == tenant_id)
    )
    vrf = result.scalar_one_or_none()
    if vrf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VRF not found")

    update_data = vrf_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vrf, field, value)

    db.add(vrf)
    await db.flush()
    await db.refresh(vrf)

    await log_audit(db, tenant_id, current_user.id, "update", "vrf", str(vrf.id),
                    new_value=vrf.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return VRFResponse.model_validate(vrf)


@router.delete("/{vrf_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete VRF")
async def delete_vrf(
    request: Request,
    vrf_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("vrf", "delete")),
):
    result = await db.execute(
        select(VRF).where(VRF.id == vrf_id, VRF.tenant_id == tenant_id)
    )
    vrf = result.scalar_one_or_none()
    if vrf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VRF not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "vrf", str(vrf_id),
                    old_value=vrf.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(vrf)
    await db.flush()
