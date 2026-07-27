"""Reporting and dashboard endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.models.ip_address import IPAddress
from app.models.subnet import Subnet
from app.models.site import Site
from app.models.vlan import VLAN
from app.models.user import User

router = APIRouter()


@router.get("/dashboard", summary="Get dashboard summary")
async def get_dashboard(
    limit: int = Query(5, description="Number of top subnets to return"),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get a summary dashboard for the current tenant."""
    # Site count
    site_count = await db.execute(
        select(func.count(Site.id)).where(Site.tenant_id == tenant_id)
    )
    total_sites = site_count.scalar() or 0

    # VLAN count
    vlan_count = await db.execute(
        select(func.count(VLAN.id)).where(VLAN.tenant_id == tenant_id)
    )
    total_vlans = vlan_count.scalar() or 0

    # Subnet count
    subnet_count = await db.execute(
        select(func.count(Subnet.id)).where(Subnet.tenant_id == tenant_id)
    )
    total_subnets = subnet_count.scalar() or 0

    # Calculate total IP capacity from all subnet CIDR blocks
    all_subnets = await db.execute(
        select(Subnet).where(Subnet.tenant_id == tenant_id)
    )
    total_capacity = 0
    for subnet in all_subnets.scalars().all():
        total_capacity += 2 ** (32 - subnet.prefix_length) - 2

    # IP address counts by status
    ip_status_counts = await db.execute(
        select(IPAddress.status, func.count(IPAddress.id))
        .where(IPAddress.tenant_id == tenant_id)
        .group_by(IPAddress.status)
    )
    ip_by_status = {row[0]: row[1] for row in ip_status_counts.all()}

    allocated_ips = ip_by_status.get("allocated", 0)
    reserved_ips = ip_by_status.get("reserved", 0)
    available_ips = max(0, total_capacity - allocated_ips - reserved_ips)
    unused_ips = ip_by_status.get("unused", 0)

    # Top subnets by utilization
    subnet_utilization = []
    subnets_result = await db.execute(
        select(Subnet).where(Subnet.tenant_id == tenant_id).limit(10)
    )
    for subnet in subnets_result.scalars().all():
        import ipaddress

        network = ipaddress.IPv4Network(
            f"{subnet.network_address}/{subnet.prefix_length}", strict=False
        )
        total_host_ips = 2 ** (32 - subnet.prefix_length) - 2

        used_in_subnet = await db.execute(
            select(func.count(IPAddress.id)).where(
                IPAddress.tenant_id == tenant_id,
                IPAddress.subnet_id == subnet.id,
                IPAddress.status.in_(["allocated", "reserved"]),
            )
        )
        used_count = used_in_subnet.scalar() or 0

        subnet_utilization.append(
            {
                "subnet_id": str(subnet.id),
                "name": subnet.name,
                "network": f"{subnet.network_address}/{subnet.prefix_length}",
                "total_ips": total_host_ips,
                "used": used_count,
                "utilization_pct": round((used_count / total_host_ips * 100), 2) if total_host_ips > 0 else 0.0,
            }
        )

    # Sort by utilization descending
    subnet_utilization.sort(key=lambda x: x["utilization_pct"], reverse=True)

    return {
        "summary": {
            "total_sites": total_sites,
            "total_vlans": total_vlans,
            "total_subnets": total_subnets,
            "total_ips": total_capacity,
            "allocated_ips": allocated_ips,
            "reserved_ips": reserved_ips,
            "available_ips": available_ips,
            "unused_ips": unused_ips,
        },
        "top_subnets_by_utilization": subnet_utilization[:limit],
    }


@router.get("/subnet-utilization", summary="Get subnet utilization report")
async def get_subnet_utilization(
    site_id: Optional[UUID] = Query(None, description="Filter by site"),
    threshold: Optional[float] = Query(80.0, description="Utilization threshold %"),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get a utilization report for all subnets, optionally filtered by site."""
    import ipaddress

    query = select(Subnet).where(Subnet.tenant_id == tenant_id)
    if site_id:
        query = query.where(Subnet.site_id == site_id)

    subnets_result = await db.execute(query)
    subnets = subnets_result.scalars().all()

    report = []
    for subnet in subnets:
        network = ipaddress.IPv4Network(
            f"{subnet.network_address}/{subnet.prefix_length}", strict=False
        )
        total_host_ips = 2 ** (32 - subnet.prefix_length) - 2

        used_result = await db.execute(
            select(func.count(IPAddress.id)).where(
                IPAddress.tenant_id == tenant_id,
                IPAddress.subnet_id == subnet.id,
                IPAddress.status.in_(["allocated", "reserved"]),
            )
        )
        used_count = used_result.scalar() or 0

        utilization = round((used_count / total_host_ips * 100), 2) if total_host_ips > 0 else 0.0

        report.append(
            {
                "subnet_id": str(subnet.id),
                "name": subnet.name,
                "network": f"{subnet.network_address}/{subnet.prefix_length}",
                "site_id": str(subnet.site_id) if subnet.site_id else None,
                "total_ips": total_host_ips,
                "used": used_count,
                "available": max(0, total_host_ips - used_count),
                "utilization_pct": utilization,
                "exceeds_threshold": utilization >= threshold,
            }
        )

    # Sort by utilization descending
    report.sort(key=lambda x: x["utilization_pct"], reverse=True)

    # Filter by threshold if needed (flagged subnets)
    flagged = [r for r in report if r["exceeds_threshold"]]

    return {
        "all_subnets": report,
        "flagged_subnets": flagged,
        "flagged_count": len(flagged),
    }


@router.get("/ip-history/{address}", summary="Get IP address audit history")
async def get_ip_history(
    address: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get the audit history for a specific IP address."""
    from app.models.audit import AuditLog

    # First verify the IP belongs to this tenant
    ip_result = await db.execute(
        select(IPAddress).where(
            IPAddress.tenant_id == tenant_id,
            IPAddress.address == address,
        )
    )
    ip = ip_result.scalar_one_or_none()
    if ip is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="IP address not found")

    # Get audit logs for this IP
    audit_result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.tenant_id == tenant_id,
            AuditLog.entity_type == "ip_address",
            AuditLog.entity_id == str(ip.id),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    logs = audit_result.scalars().all()

    return {
        "address": address,
        "current_status": {
            "status": ip.status,
            "hostname": ip.hostname,
            "assigned_to": ip.assigned_to,
            "device_type": ip.device_type,
        },
        "history": [
            {
                "action": log.action,
                "user_id": str(log.user_id),
                "old_value": log.old_value,
                "new_value": log.new_value,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


@router.get("/map-data", summary="Get map location data for dashboard")
async def get_map_data(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get site locations with aggregated subnet data for the world map."""
    import ipaddress
    from app.models.vlan import VLAN

    # Get all sites with coordinates
    sites_result = await db.execute(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.latitude.isnot(None),
            Site.longitude.isnot(None),
        )
    )
    sites = sites_result.scalars().all()

    map_locations = []
    for site in sites:
        # Get subnets for this site
        subnets_result = await db.execute(
            select(Subnet).where(
                Subnet.tenant_id == tenant_id,
                Subnet.site_id == site.id,
            )
        )
        subnets = subnets_result.scalars().all()

        networks = []
        for subnet in subnets:
            total_ips = 2 ** (32 - subnet.prefix_length) - 2

            used_result = await db.execute(
                select(func.count(IPAddress.id)).where(
                    IPAddress.tenant_id == tenant_id,
                    IPAddress.subnet_id == subnet.id,
                    IPAddress.status.in_(["allocated", "reserved"]),
                )
            )
            used_count = used_result.scalar() or 0

            # Get VLAN tag if subnet has a VLAN
            vlan_tag = None
            if subnet.vlan_id:
                vlan_result = await db.execute(
                    select(VLAN).where(VLAN.id == subnet.vlan_id)
                )
                vlan = vlan_result.scalar_one_or_none()
                if vlan:
                    vlan_tag = vlan.vlan_id

            networks.append({
                "subnet_name": subnet.name,
                "cidr": f"{subnet.network_address}/{subnet.prefix_length}",
                "vlan_tag": vlan_tag,
                "allocated_ips": used_count,
                "total_ips": total_ips,
            })

        map_locations.append({
            "site_id": str(site.id),
            "site_name": site.name,
            "latitude": site.latitude,
            "longitude": site.longitude,
            "networks": networks,
        })

    return map_locations
