"""Tenant management endpoints."""

from uuid import UUIDfrom fastapi import APIRouter, Depends, HTTPException, statusfrom sqlalchemy import selectfrom sqlalchemy.ext.asyncio import AsyncSessionfrom app.core.database import get_dbfrom app.core.security import require_rolefrom app.models.tenant import Tenantfrom app.models.user import Userfrom app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdaterouter = APIRouter()


@router.get("", response_model=list[TenantResponse], summary="List all tenants")
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """List all tenants. Requires superadmin role."""
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return [TenantResponse.model_validate(t) for t in tenants]


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED, summary="Create tenant")
async def create_tenant(
    tenant_in: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Create a new tenant. Requires superadmin role."""
    # Check for duplicate name
    existing = await db.execute(select(Tenant).where(Tenant.name == tenant_in.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant with this name already exists",
        )

    tenant = Tenant(**tenant_in.model_dump())
    db.add(tenant)
    await db.flush()
    await db.refresh(tenant)

    return TenantResponse.model_validate(tenant)

@router.get("/{tenant_id}", response_model=TenantResponse, summary="Get tenant by ID")
async def get_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get a specific tenant by ID. Requires superadmin role."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return TenantResponse.model_validate(tenant)


@router.put("/{tenant_id}", response_model=TenantResponse, summary="Update tenant")
async def update_tenant(
    tenant_id: UUID,
    tenant_in: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update a tenant. Requires superadmin role."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.add(tenant)
    await db.flush()
    await db.refresh(tenant)

    return TenantResponse.model_validate(tenant)


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete tenant")
async def delete_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Delete a tenant. Requires superadmin role."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    await db.delete(tenant)
    await db.flush()
