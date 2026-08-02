"""Subnet management endpoints with tenant scoping."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import (
    find_parent_network,
    get_client_ip,
    network_contains,
    network_info,
    networks_overlap,
    parse_network,
)
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.core.validation import (
    ValidationError,
    enforce_validation_rules,
    get_fields_for,
    validate_custom_fields,
)
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.subnet import SubnetCreate, SubnetResponse, SubnetTreeResponse, SubnetUpdate

router = APIRouter()


@router.get("", response_model=list[SubnetResponse], summary="List subnets")
async def list_subnets(
    response: Response,
    search: str | None = Query(None, description="Search by name or network"),
    site_id: UUID | None = Query(None, description="Filter by site"),
    vlan_id: UUID | None = Query(None, description="Filter by VLAN"),
    vrf_id: UUID | None = Query(None, description="Filter by VRF"),
    parent_id: UUID | None = Query(None, description="Filter by parent subnet"),
    family: int | None = Query(None, description="Filter by address family (4 or 6)"),
    status: str | None = Query(None, description="Filter by status"),
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
    if vrf_id:
        query = query.where(Subnet.vrf_id == vrf_id)
    if parent_id:
        query = query.where(Subnet.parent_subnet_id == parent_id)
    if family is not None:
        query = query.where(Subnet.family == family)
    if status:
        query = query.where(Subnet.status == status)

    query = query.order_by(Subnet.network_address, Subnet.prefix_length)
    subnets, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [SubnetResponse.model_validate(s) for s in subnets]


@router.post("", response_model=SubnetResponse, status_code=status.HTTP_201_CREATED, summary="Create subnet")
async def create_subnet(
    request: Request,
    subnet_in: SubnetCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("subnet", "create")),
):
    try:
        network = parse_network(subnet_in.network_address, subnet_in.prefix_length)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid network: {str(e)}",
        ) from e

    # Validate custom fields and custom validation rules before persisting
    try:
        custom_fields = validate_custom_fields(
            await get_fields_for(db, "subnet"),
            subnet_in.custom_fields,
        )
        payload = subnet_in.model_dump(exclude_unset=True)
        payload["custom_fields"] = custom_fields
        await enforce_validation_rules(db, "subnet", payload, operation="create")
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    # Overlap check — scoped to the same VRF when a VRF is set, otherwise global.
    # Parent/child hierarchies (one network contained within the other) are allowed.
    overlap_query = select(Subnet).where(Subnet.tenant_id == tenant_id)
    existing_result = await db.execute(overlap_query)
    for existing_subnet in existing_result.scalars().all():
        existing_network = parse_network(existing_subnet.network_address, existing_subnet.prefix_length)
        same_vrf = (existing_subnet.vrf_id == subnet_in.vrf_id)
        if not same_vrf:
            # Overlapping space is permitted across different VRFs
            continue
        if networks_overlap(network, existing_network):
            if network_contains(network, existing_network) or network_contains(existing_network, network):
                # One network is nested inside the other — legitimate hierarchy
                continue
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Overlaps with existing subnet: {existing_network} ({existing_subnet.name})",
            )

    # Auto-detect parent by longest-prefix containment if not explicitly provided
    parent_subnet_id = subnet_in.parent_subnet_id
    if parent_subnet_id is None:
        all_result = await db.execute(
            select(Subnet).where(Subnet.tenant_id == tenant_id)
        )
        candidates = [
            (parse_network(s.network_address, s.prefix_length), s.id)
            for s in all_result.scalars().all()
            if s.id
        ]
        parent_net = find_parent_network(candidates, network)
        if parent_net is not None:
            for cand_net, cand_id in candidates:
                if cand_net == parent_net:
                    parent_subnet_id = cand_id
                    break
    else:
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
        parent_network = parse_network(parent.network_address, parent.prefix_length)
        if not network_contains(parent_network, network) and network != parent_network:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subnet must be contained within parent subnet",
            )

    info = network_info(subnet_in.network_address, subnet_in.prefix_length)

    subnet = Subnet(
        tenant_id=tenant_id,
        network_address=info["network_address"],
        prefix_length=subnet_in.prefix_length,
        gateway=subnet_in.gateway or info["gateway_suggestion"],
        family=info["family"],
        parent_subnet_id=parent_subnet_id,
        custom_fields=custom_fields,
        **subnet_in.model_dump(exclude={"network_address", "prefix_length", "gateway", "parent_subnet_id", "custom_fields"}),
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
    current_user: User = Depends(require_permission("subnet", "update")),
):
    result = await db.execute(
        select(Subnet).where(Subnet.id == subnet_id, Subnet.tenant_id == tenant_id)
    )
    subnet = result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    update_data = subnet_in.model_dump(exclude_unset=True)

    # Validate custom fields and validation rules against the merged state
    try:
        if True:
            merged = {
                "network_address": subnet.network_address,
                "prefix_length": subnet.prefix_length,
                "gateway": subnet.gateway,
                "name": subnet.name,
                "status": subnet.status,
                "role": subnet.role,
                "is_container": subnet.is_container,
                **update_data,
            }
            if "custom_fields" in merged:
                merged["custom_fields"] = validate_custom_fields(
                    await get_fields_for(db, "subnet"),
                    merged["custom_fields"],
                )
            await enforce_validation_rules(db, "subnet", merged, operation="update")
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

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
    current_user: User = Depends(require_permission("subnet", "delete")),
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

    try:
        await enforce_validation_rules(
            db,
            "subnet",
            {
                "network_address": subnet.network_address,
                "prefix_length": subnet.prefix_length,
                "name": subnet.name,
                "status": subnet.status,
                "role": subnet.role,
                "is_container": subnet.is_container,
            },
            operation="delete",
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    await log_audit(db, tenant_id, current_user.id, "delete", "subnet", str(subnet_id),
                    old_value=f"{subnet.network_address}/{subnet.prefix_length} ({subnet.name})",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(subnet)
    await db.flush()
