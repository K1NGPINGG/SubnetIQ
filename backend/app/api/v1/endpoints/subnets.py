"""Subnet management endpoints with tenant scoping."""

import ipaddress
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.subnet import SubnetCreate, SubnetUpdate, SubnetResponse, SubnetTreeResponse
from app.core.audit import log_audit

router = APIRouter()


def _calculate_network_info(network_address: str, prefix_length: int) -> dict:
    network = ipaddress.IPv4Network(f"{network_address}/{prefix_length}", strict=False)
    hosts = list(network.hosts())
    total_ips = 2 ** (32 - prefix_length)
    return {
        "network_address": str(network.network_address),
        "broadcast_address": str(network.broadcast_address),
        "total_ips": total_ips,
        "usable_hosts": len(hosts),
        "netmask": str(network.netmask),
        "gateway_suggestion": str(hosts[0]) if hosts else None,
    }


@router.get("", response_model=List[SubnetResponse], summary="List subnets")
async def list_subnets(
    search: Optional[str] = Query(None, description="Search by name or network"),
    site_id: Optional[UUID] = Query(None, description="Filter by site"),
    vlan_id: Optional[UUID] = Query(None, description="Filter by VLAN"),
    parent_id: Optional[UUID] = Query(None, description="Filter by parent subnet"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Subnet).where(Subnet.tenant_id == tenant_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Subnet.name.ilike(search_pattern)) | (Subnet.network_address.ilike(search_pattern))
        )
    if site_id:
        query = query.where(Subnet.site_id == site_id)
    if vlan_id:
        query = query.where(Subnet.vlan_id == vlan_id)
    if parent_id:
        query = query.where(Subnet.parent_subnet_id == parent_id)
    query = query.order_by(Subnet.network_address, Subnet.prefix_length).offset(skip).limit(limit)
    result = await db.execute(query)
    subnets = result.scalars().all()
    return [SubnetResponse.model_validate(s) for s in subnets]


@router.post("", response_model=SubnetResponse, status_code=status.HTTP_201_CREATED, summary="Create subnet")
async def create_subnet(
    request: Request,
    subnet_in: SubnetCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    try:
        network = ipaddress.IPv4Network(
            f"{subnet_in.network_address}/{subnet_in.prefix_length}", strict=False
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid network: {str(e)}",
        )

    existing = await db.execute(
        select(Subnet).where(Subnet.tenant_id == tenant_id)
    )
    for existing_subnet in existing.scalars().all():
        existing_network = ipaddress.IPv4Network(
            f"{existing_subnet.network_address}/{existing_subnet.prefix_length}",
            strict=False,
        )
        if network.overlaps(existing_network):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Overlaps with existing subnet: {existing_network} ({existing_subnet.name})",
            )

    if subnet_in.parent_subnet_id:
        parent_result = await db.execute(
            select(Subnet).where(
                Subnet.id == subnet_in.parent_subnet_id,
                Subnet.tenant_id == tenant_id,
            )
        )
        parent = parent_result.scalar_one_or_none()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent subnet not found",
            )
        parent_network = ipaddress.IPv4Network(
            f"{parent.network_address}/{parent.prefix_length}", strict=False
        )
        if not network.subnet_of(parent_network) and network != parent_network:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subnet must be contained within parent subnet",
            )

    network_info = _calculate_network_info(subnet_in.network_address, subnet_in.prefix_length)

    subnet = Subnet(
        tenant_id=tenant_id,
        network_address=network_info["network_address"],
        prefix_length=subnet_in.prefix_length,
        gateway=subnet_in.gateway or network_info["gateway_suggestion"],
        **subnet_in.model_dump(exclude={"network_address", "prefix_length", "gateway"}),
    )
    db.add(subnet)
    await db.flush()
    await db.refresh(subnet)

    await log_audit(db, tenant_id, current_user.id, "create", "subnet", str(subnet.id),
                    new_value=f"{subnet.network_address}/{subnet.prefix_length} ({subnet.name})",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return SubnetResponse.model_validate(subnet)


@router.get("/{subnet_id}", response_model=SubnetResponse, summary="Get subnet by ID")
async def get_subnet(
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")
    return SubnetResponse.model_validate(subnet)


@router.get("/{subnet_id}/tree", response_model=SubnetTreeResponse, summary="Get subnet hierarchy")
async def get_subnet_tree(
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    children_result = await db.execute(
        select(Subnet).where(
            Subnet.parent_subnet_id == subnet_id,
            Subnet.tenant_id == tenant_id,
        ).order_by(Subnet.network_address)
    )
    children = children_result.scalars().all()

    return SubnetTreeResponse(
        subnet=SubnetResponse.model_validate(subnet),
        children=[SubnetResponse.model_validate(c) for c in children],
    )


@router.put("/{subnet_id}", response_model=SubnetResponse, summary="Update subnet")
async def update_subnet(
    request: Request,
    subnet_id: UUID,
    subnet_in: SubnetUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    update_data = subnet_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subnet, field, value)

    db.add(subnet)
    await db.flush()
    await db.refresh(subnet)

    await log_audit(db, tenant_id, current_user.id, "update", "subnet", str(subnet.id),
                    new_value=f"{subnet.network_address}/{subnet.prefix_length} ({subnet.name})",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return SubnetResponse.model_validate(subnet)


@router.delete("/{subnet_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete subnet")
async def delete_subnet(
    request: Request,
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    children_result = await db.execute(
        select(Subnet).where(Subnet.parent_subnet_id == subnet_id)
    )
    if children_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete subnet with child subnets. Remove children first.",
        )

    await log_audit(db, tenant_id, current_user.id, "delete", "subnet", str(subnet_id),
                    old_value=f"{subnet.network_address}/{subnet.prefix_length} ({subnet.name})",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(subnet)
    await db.flush()
