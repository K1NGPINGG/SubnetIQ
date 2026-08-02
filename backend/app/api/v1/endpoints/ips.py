"""IP address management endpoints with tenant scoping."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.core.ip_utils import (
    network_size,
    parse_address,
    parse_network,
    usable_host_count,
)
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.core.validation import (
    ValidationError,
    enforce_validation_rules,
    get_fields_for,
    validate_custom_fields,
)
from app.models.ip_address import IPAddress
from app.models.subnet import Subnet
from app.models.user import User
from app.models.vrf import VRF
from app.schemas.ip_address import (
    IPAddressBulkCreateRequest,
    IPAddressCreate,
    IPAddressResponse,
    IPAddressUpdate,
    IPAllocationRequest,
    SubnetUsageResponse,
)

router = APIRouter()


@router.get("/records", response_model=list[IPAddressResponse], summary="List all IP records with tags, custom fields, and VRF")
async def list_ip_records(
    subnet_id: UUID | None = Query(None, description="Filter by subnet"),
    vrf_id: UUID | None = Query(None, description="Filter by VRF"),
    status: str | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, description="Search by address, hostname, or description"),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Return all IP address records for the current tenant (no pagination),
    enriched with subnet and VRF names for use in the IPAM Records list and exports."""
    query = (
        select(IPAddress, Subnet, VRF)
        .join(Subnet, Subnet.id == IPAddress.subnet_id)
        .outerjoin(VRF, VRF.id == IPAddress.vrf_id)
        .where(IPAddress.tenant_id == tenant_id)
    )

    if subnet_id:
        query = query.where(IPAddress.subnet_id == subnet_id)
    if vrf_id:
        query = query.where(IPAddress.vrf_id == vrf_id)
    if status:
        query = query.where(IPAddress.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            (IPAddress.address.ilike(pattern))
            | (IPAddress.hostname.ilike(pattern))
            | (IPAddress.description.ilike(pattern))
        )

    query = query.order_by(IPAddress.address)

    result = await db.execute(query)
    rows = result.all()

    records: list[dict] = []
    for ip, subnet, vrf in rows:
        record = IPAddressResponse.model_validate(ip).model_dump()
        record["subnet_name"] = subnet.name if subnet else None
        record["subnet_cidr"] = (
            f"{subnet.network_address}/{subnet.prefix_length}" if subnet else None
        )
        record["vrf_name"] = vrf.name if vrf else None
        records.append(record)

    return records


@router.get("", response_model=list[IPAddressResponse], summary="List IP addresses")
async def list_ips(
    response: Response,
    subnet_id: UUID | None = Query(None, description="Filter by subnet"),
    vrf_id: UUID | None = Query(None, description="Filter by VRF"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    family: int | None = Query(None, description="Filter by address family (4 or 6)"),
    search: str | None = Query(None, description="Search by address or hostname"),
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
    if vrf_id:
        query = query.where(IPAddress.vrf_id == vrf_id)
    if status_filter:
        query = query.where(IPAddress.status == status_filter)
    if family is not None:
        query = query.where(IPAddress.family == family)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (IPAddress.address.ilike(search_pattern))
            | (IPAddress.hostname.ilike(search_pattern))
            | (IPAddress.description.ilike(search_pattern))
        )

    query = query.order_by(IPAddress.address)
    ips, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [IPAddressResponse.model_validate(ip) for ip in ips]


@router.post("", response_model=IPAddressResponse, status_code=status.HTTP_201_CREATED, summary="Create IP address")
async def create_ip(
    ip_in: IPAddressCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "create")),
):
    """Create a new IP address record."""
    try:
        addr = parse_address(ip_in.address)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid IP address format",
        ) from None

    # Check for duplicate address within the same VRF scope
    existing = await db.execute(
        select(IPAddress).where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.address == str(addr),
            IPAddress.vrf_id == ip_in.vrf_id,
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
        subnet_network = parse_network(subnet.network_address, subnet.prefix_length)
        if addr not in subnet_network:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"IP address {addr} is not within subnet {subnet_network}",
            )

    # Validate custom fields and custom validation rules
    try:
        custom_fields = validate_custom_fields(
            await get_fields_for(db, "ip_address"),
            ip_in.custom_fields,
        )
        payload = ip_in.model_dump(exclude_unset=True)
        payload["custom_fields"] = custom_fields
        await enforce_validation_rules(db, "ip_address", payload, operation="create")
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    ip = IPAddress(
        tenant_id=tenant_id,
        family=addr.version,
        custom_fields=custom_fields,
        **ip_in.model_dump(exclude={"family", "custom_fields"}),
    )
    db.add(ip)
    await db.flush()
    await db.refresh(ip)

    return IPAddressResponse.model_validate(ip)


@router.post("/allocate", response_model=IPAddressResponse, summary="Allocate next available IP")
async def allocate_ip(
    allocation_in: IPAllocationRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "create")),
):
    """Allocate the next available IP address from a subnet."""
    subnet_result = await db.execute(
        select(Subnet).where(
            Subnet.id == allocation_in.subnet_id,
            Subnet.tenant_id == tenant_id,
        )
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    subnet_network = parse_network(subnet.network_address, subnet.prefix_length)

    # Get all used IPs in this subnet (scoped to the subnet's VRF)
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
        vrf_id=subnet.vrf_id,
        address=next_available,
        family=subnet.family,
        hostname=allocation_in.hostname,
        status="allocated",
        device_type=allocation_in.device_type,
        description=allocation_in.description or f"Auto-allocated from {subnet.name}",
        assigned_to=allocation_in.assigned_to,
        allocated_at=datetime.now(UTC),
    )
    db.add(ip)
    await db.flush()
    await db.refresh(ip)

    return IPAddressResponse.model_validate(ip)


@router.post("/bulk", response_model=list[IPAddressResponse], status_code=status.HTTP_201_CREATED, summary="Bulk create IPs")
async def bulk_create_ips(
    bulk_in: IPAddressBulkCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "create")),
):
    """Bulk create multiple IP address records."""
    created_ips = []

    for ip_in in bulk_in.addresses:
        try:
            addr = parse_address(ip_in.address)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid IP address: {ip_in.address}",
            ) from None

        existing = await db.execute(
            select(IPAddress).where(
                IPAddress.tenant_id == tenant_id,
                IPAddress.address == str(addr),
                IPAddress.vrf_id == ip_in.vrf_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"IP address {addr} already exists",
            )

        ip = IPAddress(
            tenant_id=tenant_id,
            family=addr.version,
            **ip_in.model_dump(exclude={"family"}),
        )
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
    current_user: User = Depends(require_permission("ip_address", "update")),
):
    """Update an IP address within the current tenant."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")

    update_data = ip_in.model_dump(exclude_unset=True)

    # Validate custom fields and validation rules against merged state
    try:
        merged = {
            "address": ip.address,
            "hostname": ip.hostname,
            "status": ip.status,
            "description": ip.description,
            **update_data,
        }
        if "custom_fields" in merged:
            merged["custom_fields"] = validate_custom_fields(
                await get_fields_for(db, "ip_address"),
                merged["custom_fields"],
            )
        await enforce_validation_rules(db, "ip_address", merged, operation="update")
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

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
    current_user: User = Depends(require_permission("ip_address", "delete")),
):
    """Delete an IP address within the current tenant."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")

    try:
        await enforce_validation_rules(
            db,
            "ip_address",
            {
                "address": ip.address,
                "hostname": ip.hostname,
                "status": ip.status,
                "description": ip.description,
            },
            operation="delete",
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    await db.delete(ip)
    await db.flush()


@router.get("/usage/{subnet_id}", response_model=SubnetUsageResponse, summary="Get subnet IP usage")
async def get_subnet_usage(
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get IP address usage statistics for a subnet (IPv4 and IPv6 aware)."""
    subnet_result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    total_ips = network_size(subnet.network_address, subnet.prefix_length)
    usable_hosts = usable_host_count(subnet.network_address, subnet.prefix_length)

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
    available = max(0, usable_hosts - used)

    return SubnetUsageResponse(
        subnet_id=subnet_id,
        network=f"{subnet.network_address}/{subnet.prefix_length}",
        family=subnet.family,
        total_ips=total_ips,
        usable_hosts=usable_hosts,
        allocated=allocated,
        reserved=reserved,
        available=available,
        utilization_pct=round((used / usable_hosts * 100), 2) if usable_hosts > 0 else 0.0,
    )
