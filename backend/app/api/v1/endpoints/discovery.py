"""Network discovery endpoints with tenant scoping."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.database import get_db
from app.core.audit import log_audit
from app.core.ip_utils import get_client_ip
from app.models.discovery import DiscoveryScan
from app.models.subnet import Subnet
from app.models.user import User
from app.schemas.discovery import (
    DiscoveryScanCreate,
    DiscoveryScanResponse,
    ScanResultsResponse,
    DiscoveryRunRequest,
    DiscoveryRunResponse,
)

router = APIRouter()


@router.get("", response_model=List[DiscoveryScanResponse], summary="List discovery scans")
async def list_scans(
    subnet_id: Optional[UUID] = Query(None, description="Filter by subnet"),
    scan_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """List all discovery scans for the current tenant."""
    query = select(DiscoveryScan).where(DiscoveryScan.tenant_id == tenant_id)

    if subnet_id:
        query = query.where(DiscoveryScan.subnet_id == subnet_id)
    if scan_status:
        query = query.where(DiscoveryScan.status == scan_status)

    query = query.order_by(DiscoveryScan.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    scans = result.scalars().all()
    return [DiscoveryScanResponse.model_validate(s) for s in scans]


@router.get("/latest/{subnet_id}", response_model=ScanResultsResponse, summary="Get latest scan results for a subnet")
async def get_latest_scan(
    subnet_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get the latest completed discovery scan results for a specific subnet."""
    query = (
        select(DiscoveryScan)
        .where(
            DiscoveryScan.tenant_id == tenant_id,
            DiscoveryScan.subnet_id == subnet_id,
            DiscoveryScan.status == "completed",
        )
        .order_by(DiscoveryScan.completed_at.desc())
        .limit(1)
    )
    result = await db.execute(query)
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No completed scan found for this subnet")

    return ScanResultsResponse(
        scan_id=scan.id,
        subnet_id=scan.subnet_id,
        scan_type=scan.scan_type,
        status=scan.status,
        completed_at=scan.completed_at,
        results=scan.results,
    )


@router.post("", response_model=DiscoveryScanResponse, status_code=status.HTTP_201_CREATED, summary="Start discovery scan")
async def start_scan(
    scan_in: DiscoveryScanCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new network discovery scan or schedule one."""
    # Verify subnet exists and belongs to tenant
    subnet_result = await db.execute(
        select(Subnet).where(
            Subnet.id == scan_in.subnet_id,
            Subnet.tenant_id == tenant_id,
        )
    )
    subnet = subnet_result.scalar_one_or_none()
    if subnet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")

    scan = DiscoveryScan(
        tenant_id=tenant_id,
        subnet_id=scan_in.subnet_id,
        scan_type=scan_in.scan_type,
        status="pending" if not scan_in.is_scheduled else "scheduled",
        is_scheduled=scan_in.is_scheduled,
        schedule_time=scan_in.schedule_time,
        is_recursive=scan_in.is_recursive,
        interval_minutes=scan_in.interval_minutes,
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)
    await db.commit()

    if not scan_in.is_scheduled:
        from app.tasks.worker import run_discovery_scan
        run_discovery_scan.delay(str(scan.id))

    return DiscoveryScanResponse.model_validate(scan)


@router.post("/run", response_model=DiscoveryRunResponse, summary="Run asset discovery")
async def run_discovery(
    request: Request,
    run_in: DiscoveryRunRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Unified endpoint to trigger SNMP, WinRM, or Ping auto-discovery scans.
    Captures client IP for audit logging."""
    import ipaddress as ip_mod

    # Resolve target IPs
    target_ips: list[str] = []

    if run_in.target_ips:
        target_ips = run_in.target_ips
    elif run_in.subnet_id:
        subnet_result = await db.execute(
            select(Subnet).where(
                Subnet.id == run_in.subnet_id,
                Subnet.tenant_id == tenant_id,
            )
        )
        subnet = subnet_result.scalar_one_or_none()
        if subnet is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subnet not found")
        network = ip_mod.IPv4Network(
            f"{subnet.network_address}/{subnet.prefix_length}", strict=False
        )
        target_ips = [str(h) for h in network.hosts()]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either target_ips or subnet_id must be provided",
        )

    if not target_ips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid target IPs to scan",
        )

    # Load SNMP credential if specified
    snmp_community = run_in.snmp_community or "public"
    if run_in.snmp_credential_id:
        from app.models.snmp_credential import SNMPCredential
        cred_result = await db.execute(
            select(SNMPCredential).where(
                SNMPCredential.id == run_in.snmp_credential_id,
                SNMPCredential.tenant_id == tenant_id,
            )
        )
        cred = cred_result.scalar_one_or_none()
        if cred and cred.community_string:
            snmp_community = cred.community_string

    scan_type_upper = run_in.scan_type.upper()
    task_id = ""

    # Create a DiscoveryScan record for tracking
    scan_record = DiscoveryScan(
        tenant_id=tenant_id,
        subnet_id=run_in.subnet_id,
        scan_type=scan_type_upper,
        status="running",
        started_at=datetime.now(timezone.utc),
        results={"total_targets": len(target_ips), "discovered": 0, "updated": 0, "failed": 0},
    )
    db.add(scan_record)
    await db.flush()
    await db.refresh(scan_record)
    await db.commit()
    scan_id = str(scan_record.id)

    if scan_type_upper == "SNMP":
        from app.tasks.worker import celery_app
        task = celery_app.send_task(
            "tasks.run_snmp_asset_discovery",
            args=[str(tenant_id), target_ips, snmp_community, scan_id],
        )
        task_id = task.id

    elif scan_type_upper == "WINRM":
        winrm_user = run_in.winrm_username
        winrm_pass = run_in.winrm_password
        winrm_port = run_in.winrm_port
        winrm_ssl = run_in.winrm_use_ssl

        if run_in.winrm_credential_id:
            from app.models.winrm_credential import WinRMCredential
            wcred_result = await db.execute(
                select(WinRMCredential).where(
                    WinRMCredential.id == run_in.winrm_credential_id,
                    WinRMCredential.tenant_id == tenant_id,
                )
            )
            wcred = wcred_result.scalar_one_or_none()
            if wcred:
                winrm_user = wcred.username
                winrm_pass = wcred.password
                winrm_port = wcred.port
                winrm_ssl = wcred.use_ssl

        if not winrm_user or not winrm_pass:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="winrm_username and winrm_password are required for WinRM discovery (or provide a winrm_credential_id)",
            )
        from app.tasks.worker import celery_app
        task = celery_app.send_task(
            "tasks.run_winrm_asset_discovery",
            args=[str(tenant_id), target_ips, winrm_user, winrm_pass, winrm_port, winrm_ssl, scan_id],
        )
        task_id = task.id

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported scan_type '{run_in.scan_type}'. Use SNMP, WINRM, PING, or FULL.",
        )

    # Audit log
    await log_audit(
        db, tenant_id, current_user.id, "run_now", "asset_discovery", task_id,
        new_value=f"{scan_type_upper} discovery on {len(target_ips)} targets",
        user_email=current_user.email,
        user_name=current_user.display_name,
        ip_address=get_client_ip(request),
    )

    return DiscoveryRunResponse(
        task_id=task_id,
        scan_id=scan_id,
        scan_type=scan_type_upper,
        target_count=len(target_ips),
        message=f"{scan_type_upper} discovery scan dispatched for {len(target_ips)} targets",
    )


@router.get("/{scan_id}", response_model=DiscoveryScanResponse, summary="Get scan by ID")
async def get_scan(
    scan_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific discovery scan."""
    result = await db.execute(
        select(DiscoveryScan).where(
            DiscoveryScan.id == scan_id,
            DiscoveryScan.tenant_id == tenant_id,
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    return DiscoveryScanResponse.model_validate(scan)


@router.post("/{scan_id}/cancel", response_model=DiscoveryScanResponse, summary="Cancel a scan")
async def cancel_scan(
    scan_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a pending or running discovery scan."""
    result = await db.execute(
        select(DiscoveryScan).where(
            DiscoveryScan.id == scan_id,
            DiscoveryScan.tenant_id == tenant_id,
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    if scan.status not in ("pending", "running", "scheduled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel scan in \'{scan.status}\' status",
        )

    scan.status = "cancelled"
    db.add(scan)
    await db.flush()
    await db.refresh(scan)
    await db.commit()

    return DiscoveryScanResponse.model_validate(scan)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete scan")
async def delete_scan(
    scan_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a discovery scan."""
    result = await db.execute(
        select(DiscoveryScan).where(
            DiscoveryScan.id == scan_id,
            DiscoveryScan.tenant_id == tenant_id,
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    if scan.status == "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a running scan. Cancel it first.",
        )

    await db.delete(scan)
    await db.flush()
    await db.commit()
