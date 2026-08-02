"""Global search endpoint across all major IPAM objects."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.models.ip_address import IPAddress
from app.models.site import Site
from app.models.subnet import Subnet
from app.models.user import User
from app.models.vlan import VLAN
from app.models.vrf import VRF

router = APIRouter()

# Object kinds supported by global search
KINDS = ("subnet", "ip_address", "site", "vlan", "vrf")


@router.get("", summary="Global search across IPAM objects")
async def global_search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    kinds: str | None = Query(None, description="Comma-separated object kinds to search"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Search subnets, IPs, sites, VLANs and VRFs by name/address/code."""
    wanted = set(KINDS)
    if kinds:
        wanted = {k.strip() for k in kinds.split(",") if k.strip() in KINDS}

    pattern = f"%{q}%"
    results: list[dict[str, Any]] = []

    if "subnet" in wanted:
        subnet_result = await db.execute(
            select(Subnet).where(
                Subnet.tenant_id == tenant_id,
                (Subnet.name.ilike(pattern)) | (Subnet.network_address.ilike(pattern)),
            ).order_by(Subnet.network_address).limit(limit)
        )
        for s in subnet_result.scalars().all():
            results.append({
                "kind": "subnet",
                "id": str(s.id),
                "label": f"{s.network_address}/{s.prefix_length}",
                "secondary": s.name or "",
                "status": s.status,
                "family": s.family,
            })

    if "ip_address" in wanted:
        ip_result = await db.execute(
            select(IPAddress).where(
                IPAddress.tenant_id == tenant_id,
                (IPAddress.address.ilike(pattern)) | (IPAddress.hostname.ilike(pattern)),
            ).order_by(IPAddress.address).limit(limit)
        )
        for ip in ip_result.scalars().all():
            results.append({
                "kind": "ip_address",
                "id": str(ip.id),
                "label": ip.address,
                "secondary": ip.hostname or "",
                "status": ip.status,
                "family": ip.family,
            })

    if "site" in wanted:
        site_result = await db.execute(
            select(Site).where(
                Site.tenant_id == tenant_id,
                (Site.name.ilike(pattern)) | (Site.code.ilike(pattern)),
            ).order_by(Site.name).limit(limit)
        )
        for site in site_result.scalars().all():
            results.append({
                "kind": "site",
                "id": str(site.id),
                "label": site.name,
                "secondary": site.code or "",
            })

    if "vlan" in wanted:
        try:
            vlan_number = int(q)
        except ValueError:
            vlan_number = None
        vlan_result = await db.execute(
            select(VLAN).where(
                VLAN.tenant_id == tenant_id,
                VLAN.name.ilike(pattern) | (
                    VLAN.vlan_id == vlan_number if vlan_number is not None else VLAN.vlan_id == -1
                ),
            ).order_by(VLAN.name).limit(limit)
        )
        for vlan in vlan_result.scalars().all():
            results.append({
                "kind": "vlan",
                "id": str(vlan.id),
                "label": vlan.name,
                "secondary": f"VLAN {vlan.vlan_id}",
            })

    if "vrf" in wanted:
        vrf_result = await db.execute(
            select(VRF).where(
                VRF.tenant_id == tenant_id,
                (VRF.name.ilike(pattern)) | (VRF.rd.ilike(pattern)),
            ).order_by(VRF.name).limit(limit)
        )
        for vrf in vrf_result.scalars().all():
            results.append({
                "kind": "vrf",
                "id": str(vrf.id),
                "label": vrf.name,
                "secondary": vrf.rd or "",
            })

    return {
        "query": q,
        "count": len(results),
        "results": results,
    }
