"""IP release & allocation approval workflow endpoints."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.core.rbac import require_permission
from app.models.approval import ApprovalRequest
from app.models.ip_address import IPAddress
from app.models.user import User
from app.schemas.approval import (
    ApprovalDecision,
    ApprovalRequestCreate,
    ApprovalRequestResponse,
)

router = APIRouter()

PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"


@router.get("", response_model=list[ApprovalRequestResponse], summary="List approval requests")
async def list_approvals(
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    request_type: str | None = Query(None, description="Filter by request type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    query = select(ApprovalRequest).where(ApprovalRequest.tenant_id == tenant_id)
    if status_filter:
        query = query.where(ApprovalRequest.status == status_filter)
    if request_type:
        query = query.where(ApprovalRequest.request_type == request_type)
    query = query.order_by(ApprovalRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()
    return [ApprovalRequestResponse.model_validate(a) for a in approvals]


@router.post(
    "/ip/{ip_id}/release",
    response_model=ApprovalRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request IP release approval",
)
async def request_release(
    request: Request,
    ip_id: UUID,
    body: ApprovalRequestCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "update")),
):
    """Queue a release request for a currently allocated IP."""
    result = await db.execute(
        select(IPAddress).where(IPAddress.id == ip_id, IPAddress.tenant_id == tenant_id)
    )
    ip = result.scalar_one_or_none()
    if ip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")

    # Only allocated/reserved IPs can be released
    if ip.status not in ("allocated", "reserved"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"IP address is not allocated/reserved (current status: {ip.status})",
        )

    # Guard against duplicate pending requests for the same IP
    dup = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.tenant_id == tenant_id,
            ApprovalRequest.ip_address_id == ip_id,
            ApprovalRequest.status == PENDING,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending approval already exists for this IP address",
        )

    approval = ApprovalRequest(
        tenant_id=tenant_id,
        request_type=body.request_type or "release",
        status=PENDING,
        reason=body.reason,
        ip_address_id=ip_id,
        requested_by=current_user.id,
    )
    db.add(approval)
    await db.flush()
    await db.refresh(approval)

    await log_audit(db, tenant_id, current_user.id, "request", "ip_release", str(approval.id),
                    new_value=f"{ip.address} ({ip.status})", user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return ApprovalRequestResponse.model_validate(approval)


@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalRequestResponse,
    summary="Approve an approval request",
)
async def approve_request(
    request: Request,
    approval_id: UUID,
    body: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "approve")),
):
    """Approve a pending request; for releases this frees the IP."""
    result = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.id == approval_id,
            ApprovalRequest.tenant_id == tenant_id,
        )
    )
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")
    if approval.status != PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Approval request already {approval.status}",
        )

    ip_result = await db.execute(
        select(IPAddress).where(IPAddress.id == approval.ip_address_id)
    )
    ip = ip_result.scalar_one_or_none()

    if approval.request_type == "release":
        if ip is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP address not found")
        ip.status = "available"
        ip.assigned_to = None
        ip.allocated_at = None
        ip.expires_at = None
        db.add(ip)

    approval.status = APPROVED
    approval.approved_by = current_user.id
    approval.decision_at = datetime.now(UTC)
    approval.decision_notes = body.notes
    db.add(approval)
    await db.flush()
    await db.refresh(approval)

    await log_audit(db, tenant_id, current_user.id, "approve", "ip_release", str(approval.id),
                    new_value=f"approved {approval.request_type} for {ip.address if ip else approval.ip_address_id}",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return ApprovalRequestResponse.model_validate(approval)


@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalRequestResponse,
    summary="Reject an approval request",
)
async def reject_request(
    request: Request,
    approval_id: UUID,
    body: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission("ip_address", "approve")),
):
    """Reject a pending request, leaving the IP untouched."""
    result = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.id == approval_id,
            ApprovalRequest.tenant_id == tenant_id,
        )
    )
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")
    if approval.status != PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Approval request already {approval.status}",
        )

    approval.status = REJECTED
    approval.approved_by = current_user.id
    approval.decision_at = datetime.now(UTC)
    approval.decision_notes = body.notes
    db.add(approval)
    await db.flush()
    await db.refresh(approval)

    await log_audit(db, tenant_id, current_user.id, "reject", "ip_release", str(approval.id),
                    new_value=f"rejected {approval.request_type} request",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return ApprovalRequestResponse.model_validate(approval)


@router.get("/{approval_id}", response_model=ApprovalRequestResponse, summary="Get approval request by ID")
async def get_approval(
    approval_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.id == approval_id,
            ApprovalRequest.tenant_id == tenant_id,
        )
    )
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")
    return ApprovalRequestResponse.model_validate(approval)
