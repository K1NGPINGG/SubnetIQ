"""VLAN management endpoints with tenant scoping."""



from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.core.rbac import require_permission
from app.models.user import User
from app.models.vlan import VLAN
from app.schemas.vlan import VLANCreate, VLANResponse, VLANUpdate

router = APIRouter()





@router.get("", response_model=list[VLANResponse], summary="List VLANs")

async def list_vlans(

    search: str | None = Query(None, description="Search by name"),

    site_id: UUID | None = Query(None, description="Filter by site"),

    skip: int = Query(0, ge=0),

    limit: int = Query(50, ge=1, le=200),

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_active_user),

):

    """List all VLANs for the current tenant with optional filtering."""

    query = select(VLAN).where(VLAN.tenant_id == tenant_id)



    if search:

        query = query.where(VLAN.name.ilike(f"%{search}%"))

    if site_id:

        query = query.where(VLAN.site_id == site_id)



    query = query.order_by(VLAN.vlan_id).offset(skip).limit(limit)

    result = await db.execute(query)

    vlans = result.scalars().all()

    return [VLANResponse.model_validate(v) for v in vlans]





@router.post("", response_model=VLANResponse, status_code=status.HTTP_201_CREATED, summary="Create VLAN")

async def create_vlan(

    vlan_in: VLANCreate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('vlan', 'create')),

):

    """Create a new VLAN for the current tenant."""

    # Check for duplicate VLAN ID within tenant

    existing = await db.execute(

        select(VLAN).where(VLAN.tenant_id == tenant_id, VLAN.vlan_id == vlan_in.vlan_id)

    )

    if existing.scalar_one_or_none():

        raise HTTPException(

            status_code=status.HTTP_409_CONFLICT,

            detail="VLAN with this ID already exists in your tenant",

        )



    vlan = VLAN(tenant_id=tenant_id, **vlan_in.model_dump())

    db.add(vlan)

    await db.flush()

    await db.refresh(vlan)



    return VLANResponse.model_validate(vlan)





@router.get("/{vlan_id}", response_model=VLANResponse, summary="Get VLAN by ID")

async def get_vlan(

    vlan_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_active_user),

):

    """Get a specific VLAN within the current tenant."""

    result = await db.execute(

        select(VLAN).where(VLAN.id == vlan_id, VLAN.tenant_id == tenant_id)

    )

    vlan = result.scalar_one_or_none()

    if vlan is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VLAN not found")

    return VLANResponse.model_validate(vlan)





@router.put("/{vlan_id}", response_model=VLANResponse, summary="Update VLAN")

async def update_vlan(

    vlan_id: UUID,

    vlan_in: VLANUpdate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('vlan', 'update')),

):

    """Update a VLAN within the current tenant."""

    result = await db.execute(

        select(VLAN).where(VLAN.id == vlan_id, VLAN.tenant_id == tenant_id)

    )

    vlan = result.scalar_one_or_none()

    if vlan is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VLAN not found")



    update_data = vlan_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():

        setattr(vlan, field, value)



    db.add(vlan)

    await db.flush()

    await db.refresh(vlan)



    return VLANResponse.model_validate(vlan)





@router.delete("/{vlan_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete VLAN")

async def delete_vlan(

    vlan_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('vlan', 'delete')),

):

    """Delete a VLAN within the current tenant."""

    result = await db.execute(

        select(VLAN).where(VLAN.id == vlan_id, VLAN.tenant_id == tenant_id)

    )

    vlan = result.scalar_one_or_none()

    if vlan is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VLAN not found")



    await db.delete(vlan)

    await db.flush()
