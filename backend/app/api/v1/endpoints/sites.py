"""Site management endpoints with tenant scoping."""



from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.core.rbac import require_permission
from app.models.site import Site
from app.models.user import User
from app.schemas.site import SiteCreate, SiteResponse, SiteUpdate

router = APIRouter()





@router.get("", response_model=list[SiteResponse], summary="List sites")

async def list_sites(

    search: str | None = Query(None, description="Search by name or code"),

    skip: int = Query(0, ge=0),

    limit: int = Query(50, ge=1, le=200),

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_active_user),

):

    query = select(Site).where(Site.tenant_id == tenant_id)

    if search:

        search_pattern = f"%{search}%"

        query = query.where(

            (Site.name.ilike(search_pattern)) | (Site.code.ilike(search_pattern))

        )

    query = query.order_by(Site.name).offset(skip).limit(limit)

    result = await db.execute(query)

    sites = result.scalars().all()

    return [SiteResponse.model_validate(s) for s in sites]





@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED, summary="Create site")

async def create_site(

    request: Request,

    site_in: SiteCreate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('site', 'create')),

):

    existing = await db.execute(

        select(Site).where(Site.tenant_id == tenant_id, Site.code == site_in.code)

    )

    if existing.scalar_one_or_none():

        raise HTTPException(

            status_code=status.HTTP_409_CONFLICT,

            detail="Site with this code already exists in your tenant",

        )



    site = Site(tenant_id=tenant_id, **site_in.model_dump())

    db.add(site)

    await db.flush()

    await db.refresh(site)



    await log_audit(db, tenant_id, current_user.id, "create", "site", str(site.id),

                    new_value=site.name, user_email=current_user.email,

                    user_name=current_user.display_name,

                    ip_address=get_client_ip(request))



    return SiteResponse.model_validate(site)





@router.get("/{site_id}", response_model=SiteResponse, summary="Get site by ID")

async def get_site(

    site_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_active_user),

):

    result = await db.execute(

        select(Site).where(Site.id == site_id, Site.tenant_id == tenant_id)

    )

    site = result.scalar_one_or_none()

    if site is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return SiteResponse.model_validate(site)





@router.put("/{site_id}", response_model=SiteResponse, summary="Update site")

async def update_site(

    request: Request,

    site_id: UUID,

    site_in: SiteUpdate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('site', 'update')),

):

    result = await db.execute(

        select(Site).where(Site.id == site_id, Site.tenant_id == tenant_id)

    )

    site = result.scalar_one_or_none()

    if site is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")



    update_data = site_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():

        setattr(site, field, value)



    db.add(site)

    await db.flush()

    await db.refresh(site)



    await log_audit(db, tenant_id, current_user.id, "update", "site", str(site.id),

                    new_value=site.name, user_email=current_user.email,

                    user_name=current_user.display_name,

                    ip_address=get_client_ip(request))



    return SiteResponse.model_validate(site)





@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete site")

async def delete_site(

    request: Request,

    site_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(require_permission('site', 'delete')),

):

    result = await db.execute(

        select(Site).where(Site.id == site_id, Site.tenant_id == tenant_id)

    )

    site = result.scalar_one_or_none()

    if site is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")



    await log_audit(db, tenant_id, current_user.id, "delete", "site", str(site_id),

                    old_value=site.name, user_email=current_user.email,

                    user_name=current_user.display_name,

                    ip_address=get_client_ip(request))



    await db.delete(site)

    await db.flush()

