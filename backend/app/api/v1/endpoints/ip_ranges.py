"""IP Range management endpoints with tenant scoping."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip, parse_address, parse_network
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.models.ip_range import IPRange
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.ip_range import IPRangeCreate, IPRangeResponse, IPRangeUpdate

router = APIRouter()


@router.get("", response_model=list[IPRangeResponse], summary="List IP ranges")
async def list_ip_ranges(
    response: Response,
    subnet_id: UUID | None = Query(None, description="Filter by subnet"),
    status: str | None = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(IPRange).where(IPRange.tenant_id == tenant_id)
    if subnet_id:
        query = query.where(IPRange.subnet_id == subnet_id)
    if status:
        query = query.where(IPRange.status == status)
    query = query.order_by(IPRange.start_address)
    rows, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [IPRangeResponse.model_validate(row) for row in rows]


@router.post("", response_model=IPRangeResponse, status_code=status.HTTP_201_CREATED, summary="Create IP range")
async def create_ip_range(
    request: Request,
    range_in: IPRangeCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('ip_range', 'create')),
):
    # Validate subnet belongs to tenant
    subnet_result = await db.execute(
        select(Subnet).where(Subnet.id == range_in.subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    try:
        start = parse_address(range_in.start_address)
        end = parse_address(range_in.end_address)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid range address: {str(e)}",
        ) from e

    if start.version != end.version:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Start and end addresses must be the same family",
        )
    if int(start) > int(end):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Start address must be less than or equal to end address",
        )

    subnet_network = parse_network(subnet.network_address, subnet.prefix_length)
    if start not in subnet_network or end not in subnet_network:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Range must be contained within the subnet",
        )

    ip_range = IPRange(
        tenant_id=tenant_id,
        subnet_id=range_in.subnet_id,
        start_address=str(start),
        end_address=str(end),
        family=start.version,
        status=range_in.status,
        description=range_in.description,
    )
    db.add(ip_range)
    await db.flush()
    await db.refresh(ip_range)

    await log_audit(db, tenant_id, current_user.id, "create", "ip_range", str(ip_range.id),
                    new_value=f"{ip_range.start_address}-{ip_range.end_address}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return IPRangeResponse.model_validate(ip_range)


@router.get("/{range_id}", response_model=IPRangeResponse, summary="Get IP range by ID")
async def get_ip_range(
    range_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(IPRange).where(IPRange.id == range_id, IPRange.tenant_id == tenant_id)
    )
    ip_range = result.scalar_one_or_none()
    if ip_range is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP range not found")
    return IPRangeResponse.model_validate(ip_range)


@router.put("/{range_id}", response_model=IPRangeResponse, summary="Update IP range")
async def update_ip_range(
    request: Request,
    range_id: UUID,
    range_in: IPRangeUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('ip_range', 'update')),
):
    result = await db.execute(
        select(IPRange).where(IPRange.id == range_id, IPRange.tenant_id == tenant_id)
    )
    ip_range = result.scalar_one_or_none()
    if ip_range is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP range not found")

    update_data = range_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ip_range, field, value)

    db.add(ip_range)
    await db.flush()
    await db.refresh(ip_range)

    await log_audit(db, tenant_id, current_user.id, "update", "ip_range", str(ip_range.id),
                    new_value=f"{ip_range.start_address}-{ip_range.end_address}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return IPRangeResponse.model_validate(ip_range)


@router.delete("/{range_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete IP range")
async def delete_ip_range(
    request: Request,
    range_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('ip_range', 'delete')),
):
    result = await db.execute(
        select(IPRange).where(IPRange.id == range_id, IPRange.tenant_id == tenant_id)
    )
    ip_range = result.scalar_one_or_none()
    if ip_range is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP range not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "ip_range", str(range_id),
                    old_value=f"{ip_range.start_address}-{ip_range.end_address}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(ip_range)
    await db.flush()
