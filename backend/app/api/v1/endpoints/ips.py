"""IP address management endpoints with tenant scoping."""

import ipaddress
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.models.ip_address import IPAddress
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.ip_address import (
    IPAddressCreate,
    IPAddressUpdate,
    IPAddressResponse,
    IPAllocationRequest,
    IPAddressBulkCreateRequest,
    SubnetUsageResponse,
)

router = APIRouter()


@router.get("", response_model=List[IPAddressResponse], summary="List IP addresses")
async def list_ips(
    subnet_id: Optional[UUID] = Query(None, description="Filter by subnet"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by address or hostname"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """List all IP addresses for the current tenant with optional filtering."""
    query = select(IPAddress).where(IPAddress.tenant_id == tenant_id)

    if subnet_id:
        query = query.where(IPAddress.subnet_id == subnet_id)
    if status_filter:
        query = query.where(IPAddress.status == status_filter)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (IPAddress.address.ilike(search_pattern))
            | (IPAddress.hostname.ilike(search_pattern))
            | (IPAddress.description.ilike(search_pattern))
        )

    query = query.order_by(IPAddress.address).offset(skip).limit(limit)
    result = await db.execute(query)
    ips = result.scalars().all()
    return [IPAddressResponse.model_validate(ip) for ip in ips]


@router.post("", response_model=IPAddressResponse, status_code=status.HTTP_201_CREATED, summary="Create IP address")
async def create_ip(
    ip_in: IPAddressCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new IP address record."""
    # Validate IP address format
    try:
        addr = ipaddress.IPv4Address(ip_in.address)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid IPv4 address format",
        )

    # Check for duplicate address
    existing = await db.execute(
        select(IPAddress).where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.address == str(addr),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"IP address {addr} already exists in your tenant",
        )

    # Validate that IP is within subnet if subnet_id is provided
    if ip_in.subnet_id:
        subnet_result = await db.execute(
            select(Subnet).where(
                Subnet.id == ip_in.subnet_id,
                Subnet.tenant_id == tenant_id,
            )
        )
        subnet = subnet_result.scalar_one_or_none()
        if subnet is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subnet not found",
            )
        subnet_network = ipaddress.IPv4Network(
            f"{subnet.network_address}/{subnet.prefix_length}", strict=False
        )
        if addr not in subnet_network:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"IP address {addr} is not within subnet {subnet_network}",
            )

    ip = IPAddress(tenant_id=tenant_id, **ip_in.model_dump())
    db.add(ip)
    await db.flush()
    await db.refresh(ip)

    return IPAddressResponse.model_validate(ip)


@router.post("/allocate", response_model=IPAddressResponse, summary="Allocate next available IP")
async def allocate_ip(
    allocation_in: IPAllocationRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Allocate the next available IP address from a subnet."""
    # Get the subnet
    subnet_result = await db.execute(
        select(Subnet).where(
            Subnet.id == allocation_in.subnet_id,
            Subnet.tenant_id == tenant_id,
        )
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    subnet_network = ipaddress.IPv4Network(
        f"{subnet.network_address}/{subnet.prefix_length}", strict=False
    )

    # Get all used IPs in this subnet
    used_result = await db.execute(
        select(IPAddress.address).where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.subnet_id == allocation_in.subnet_id,
            IPAddress.status.in_(["allocated", "reserved"]),
        )
    )
    used_ips = {row[0] for row in used_result.all()}

    # Find next available IP
    gateway_ip = str(subnet.gateway) if subnet.gateway else None
    next_available = None
    for host in subnet_network.hosts():
        host_str = str(host)
        if host_str not in used_ips and host_str != gateway_ip:
            next_available = host_str
            break

    if next_available is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available IP addresses in this subnet",
        )

    ip = IPAddress(
        tenant_id=tenant_id,
        subnet_id=allocation_in.subnet_id,
        address=next_available,
        hostname=allocation_in.hostname,
        status="allocated",
        device_type=allocation_in.device_type,
        description=allocation_in.description or f"Auto-allocated from {subnet.name}",
        assigned_to=allocation_in.assigned_to,
        allocated_at=datetime.now(timezone.utc),
    )
    db.add(ip)
    await db.flush()
    await db.refresh(ip)

    return IPAddressResponse.model_validate(ip)


@router.post("/bulk", response_model=List[IPAddressResponse], status_code=status.HTTP_201_CREATED, summary="Bulk create IPs")
async def bulk_create_ips(
    bulk_in: IPAddressBulkCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Bulk create multiple IP address records."""
    created_ips = []

    for ip_in in bulk_in.addresses:
        try:
            addr = ipaddress.IPv4Address(ip_in.address)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid IPv4 address: {ip_in.address}",
            )

        existing = await db.execute(
            select(IPAddress).where(
                IPAddress.tenant_id == tenant_id,
                IPAddress.address == str(addr),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"IP address {addr} already exists",
            )

        ip = IPAddress(tenant_id=tenant_id, **ip_in.model_dump())
        db.add(ip)
        created_ips.append(ip)

    await db.flush()
    for ip in created_ips:
        await db.refresh(ip)

    return [IPAddressResponse.model_validate(ip) for ip in created_ips]


@router.get("/{ip_id}", response_model=IPAddressResponse, summary="Get IP address by ID")
async def get_ip(
    ip_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific IP address within the current tenant."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")
    return IPAddressResponse.model_validate(ip)


@router.get("/by-address/{address}", response_model=IPAddressResponse, summary="Get IP by address")
async def get_ip_by_address(
    address: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific IP address by its address value."""
    result = await db.execute(
        select(IPAddress).where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.address == address,
        )
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")
    return IPAddressResponse.model_validate(ip)


@router.put("/{ip_id}", response_model=IPAddressResponse, summary="Update IP address")
async def update_ip(
    ip_id: UUID,
    ip_in: IPAddressUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Update an IP address within the current tenant."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")

    update_data = ip_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ip, field, value)

    db.add(ip)
    await db.flush()
    await db.refresh(ip)

    return IPAddressResponse.model_validate(ip)


@router.delete("/{ip_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete IP address")
async def delete_ip(
    ip_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an IP address within the current tenant."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")

    await db.delete(ip)
    await db.flush()


@router.get("/usage/{subnet_id}", response_model=SubnetUsageResponse, summary="Get subnet IP usage")
async def get_subnet_usage(
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get IP address usage statistics for a subnet."""
    subnet_result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    subnet_network = ipaddress.IPv4Network(
        f"{subnet.network_address}/{subnet.prefix_length}", strict=False
    )

    total_ips = 2 ** (32 - subnet.prefix_length)
    usable_hosts = total_ips - 2  # exclude network and broadcast

    # Count IPs by status
    status_counts = await db.execute(
        select(IPAddress.status, func.count(IPAddress.id))
        .where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.subnet_id == subnet_id,
        )
        .group_by(IPAddress.status)
    )
    counts = {row[0]: row[1] for row in status_counts.all()}

    allocated = counts.get("allocated", 0)
    reserved = counts.get("reserved", 0)
    used = allocated + reserved
    available = usable_hosts - used

    return SubnetUsageResponse(
        subnet_id=subnet_id,
        network=str(subnet_network),
        total_ips=total_ips,
        usable_hosts=usable_hosts,
        allocated=allocated,
        reserved=reserved,
        available=max(0, available),
        utilization_pct=round((used / usable_hosts * 100), 2) if usable_hosts > 0 else 0.0,
    )