"""RIR management endpoints (global, not tenant-scoped)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.models.rir import RIR
from app.models.user import User
from app.schemas.rir import RIRCreate, RIRResponse, RIRUpdate

router = APIRouter()


@router.get("", response_model=list[RIRResponse], summary="List RIRs")
async def list_rirs(
    response: Response,
    search: str | None = Query(None, description="Search by name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(RIR)
    if search:
        pattern = f"%{search}%"
        query = query.where(RIR.name.ilike(pattern))
    query = query.order_by(RIR.name)
    rows, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [RIRResponse.model_validate(row) for row in rows]


@router.post("", response_model=RIRResponse, status_code=status.HTTP_201_CREATED, summary="Create RIR")
async def create_rir(
    rir_in: RIRCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission('rir', 'create')),
):
    existing = await db.execute(
        select(RIR).where((RIR.name == rir_in.name) | (RIR.slug == rir_in.slug))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="RIR with this name or slug already exists",
        )
    rir = RIR(**rir_in.model_dump())
    db.add(rir)
    await db.flush()
    await db.refresh(rir)
    return RIRResponse.model_validate(rir)


@router.get("/{rir_id}", response_model=RIRResponse, summary="Get RIR by ID")
async def get_rir(
    rir_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(RIR).where(RIR.id == rir_id))
    rir = result.scalar_one_or_none()
    if rir is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RIR not found")
    return RIRResponse.model_validate(rir)


@router.put("/{rir_id}", response_model=RIRResponse, summary="Update RIR")
async def update_rir(
    rir_id: UUID,
    rir_in: RIRUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission('rir', 'update')),
):
    result = await db.execute(select(RIR).where(RIR.id == rir_id))
    rir = result.scalar_one_or_none()
    if rir is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RIR not found")

    update_data = rir_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rir, field, value)

    db.add(rir)
    await db.flush()
    await db.refresh(rir)
    return RIRResponse.model_validate(rir)


@router.delete("/{rir_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete RIR")
async def delete_rir(
    rir_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission('rir', 'delete')),
):
    result = await db.execute(select(RIR).where(RIR.id == rir_id))
    rir = result.scalar_one_or_none()
    if rir is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RIR not found")
    await db.delete(rir)
    await db.flush()
