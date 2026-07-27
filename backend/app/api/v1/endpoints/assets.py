"""Asset inventory endpoints with tenant scoping."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.models.asset import Asset
from app.models.user import User
from app.schemas.asset import AssetResponse, AssetDetailResponse, AssetListResponse

router = APIRouter()


@router.get("", response_model=AssetListResponse, summary="List assets")
async def list_assets(
    search: Optional[str] = Query(None, description="Search hostname, IP, serial, manufacturer"),
    discovery_source: Optional[str] = Query(None, description="Filter by SNMP, WINRM, PING"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    asset_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(0, ge=0),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """List all discovered assets for the current tenant with filtering and search."""
    query = select(Asset).where(Asset.tenant_id == tenant_id)
    count_query = select(func.count(Asset.id)).where(Asset.tenant_id == tenant_id)

    if search:
        search_filter = or_(
            Asset.hostname.ilike(f"%{search}%"),
            Asset.ip_address.ilike(f"%{search}%"),
            Asset.serial_number.ilike(f"%{search}%"),
            Asset.manufacturer.ilike(f"%{search}%"),
            Asset.model.ilike(f"%{search}%"),
            Asset.mac_address.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if discovery_source:
        query = query.where(Asset.discovery_source == discovery_source)
        count_query = count_query.where(Asset.discovery_source == discovery_source)

    if device_type:
        query = query.where(Asset.device_type == device_type)
        count_query = count_query.where(Asset.device_type == device_type)

    if asset_status:
        query = query.where(Asset.status == asset_status)
        count_query = count_query.where(Asset.status == asset_status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Asset.last_scanned_at.desc().nullslast(), Asset.ip_address.asc())
    query = query.offset(page * page_size).limit(page_size)

    result = await db.execute(query)
    assets = result.scalars().all()

    return AssetListResponse(
        assets=[AssetResponse.model_validate(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=AssetDetailResponse, summary="Get asset details")
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve full hardware and network interface details for a specific asset."""
    result = await db.execute(
        select(Asset).where(
            Asset.id == asset_id,
            Asset.tenant_id == tenant_id,
        )
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )
    return AssetDetailResponse.model_validate(asset)
