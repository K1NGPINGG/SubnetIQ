"""Aggregate management endpoints with tenant scoping."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import (
    get_client_ip,
    network_contains,
    network_info,
    network_size,
    parse_network,
)
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.models.aggregate import Aggregate
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.aggregate import AggregateCreate, AggregateResponse, AggregateUpdate

router = APIRouter()


@router.get("", response_model=list[AggregateResponse], summary="List aggregates")
async def list_aggregates(
    response: Response,
    search: str | None = Query(None, description="Search by network"),
    rir_id: UUID | None = Query(None, description="Filter by RIR"),
    family: int | None = Query(None, description="Filter by address family (4 or 6)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Aggregate).where(Aggregate.tenant_id == tenant_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(Aggregate.network_address.ilike(pattern))
    if rir_id:
        query = query.where(Aggregate.rir_id == rir_id)
    if family is not None:
        query = query.where(Aggregate.family == family)
    query = query.order_by(Aggregate.network_address)
    rows, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [AggregateResponse.model_validate(row) for row in rows]


@router.post("", response_model=AggregateResponse, status_code=status.HTTP_201_CREATED, summary="Create aggregate")
async def create_aggregate(
    request: Request,
    agg_in: AggregateCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('aggregate', 'create')),
):
    try:
        parse_network(agg_in.network_address, agg_in.prefix_length)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid network: {str(e)}",
        ) from e

    info = network_info(agg_in.network_address, agg_in.prefix_length)

    agg = Aggregate(
        tenant_id=tenant_id,
        network_address=info["network_address"],
        prefix_length=agg_in.prefix_length,
        family=info["family"],
        description=agg_in.description,
        rir_id=agg_in.rir_id,
    )
    db.add(agg)
    await db.flush()
    await db.refresh(agg)

    await log_audit(db, tenant_id, current_user.id, "create", "aggregate", str(agg.id),
                    new_value=f"{agg.network_address}/{agg.prefix_length}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return AggregateResponse.model_validate(agg)


@router.get("/{agg_id}", response_model=AggregateResponse, summary="Get aggregate by ID")
async def get_aggregate(
    agg_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Aggregate).where(Aggregate.id == agg_id, Aggregate.tenant_id == tenant_id)
    )
    agg = result.scalar_one_or_none()
    if agg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aggregate not found")
    return AggregateResponse.model_validate(agg)


@router.get("/{agg_id}/usage", summary="Get aggregate usage")
async def get_aggregate_usage(
    agg_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get aggregate utilization derived from child prefixes."""
    result = await db.execute(
        select(Aggregate).where(Aggregate.id == agg_id, Aggregate.tenant_id == tenant_id)
    )
    agg = result.scalar_one_or_none()
    if agg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aggregate not found")

    agg_network = parse_network(agg.network_address, agg.prefix_length)
    total_ips = network_size(agg.network_address, agg.prefix_length)

    # Sum the space consumed by child prefixes (leaf prefixes only, skip containers)
    subnets_result = await db.execute(
        select(Subnet).where(
            Subnet.tenant_id == tenant_id,
            Subnet.is_container == False,  # noqa: E712
        )
    )
    used_ips = 0
    for subnet in subnets_result.scalars().all():
        subnet_network = parse_network(subnet.network_address, subnet.prefix_length)
        if network_contains(agg_network, subnet_network):
            used_ips += subnet_network.num_addresses

    utilization_pct = round((used_ips / total_ips * 100), 2) if total_ips > 0 else 0.0
    return {
        "aggregate_id": str(agg.id),
        "network": f"{agg.network_address}/{agg.prefix_length}",
        "total_ips": total_ips,
        "used_ips": used_ips,
        "utilization_pct": utilization_pct,
    }


@router.put("/{agg_id}", response_model=AggregateResponse, summary="Update aggregate")
async def update_aggregate(
    request: Request,
    agg_id: UUID,
    agg_in: AggregateUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('aggregate', 'update')),
):
    result = await db.execute(
        select(Aggregate).where(Aggregate.id == agg_id, Aggregate.tenant_id == tenant_id)
    )
    agg = result.scalar_one_or_none()
    if agg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aggregate not found")

    update_data = agg_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agg, field, value)

    db.add(agg)
    await db.flush()
    await db.refresh(agg)

    await log_audit(db, tenant_id, current_user.id, "update", "aggregate", str(agg.id),
                    new_value=f"{agg.network_address}/{agg.prefix_length}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return AggregateResponse.model_validate(agg)


@router.delete("/{agg_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete aggregate")
async def delete_aggregate(
    request: Request,
    agg_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('aggregate', 'delete')),
):
    result = await db.execute(
        select(Aggregate).where(Aggregate.id == agg_id, Aggregate.tenant_id == tenant_id)
    )
    agg = result.scalar_one_or_none()
    if agg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aggregate not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "aggregate", str(agg_id),
                    old_value=f"{agg.network_address}/{agg.prefix_length}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(agg)
    await db.flush()
