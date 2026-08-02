"""Tag management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, validate_tenant_access
from app.core.audit import log_audit
from app.core.database import get_db
from app.core.ip_utils import get_client_ip
from app.core.pagination import fetch_page, set_pagination_headers
from app.core.rbac import require_permission
from app.core.validation import slugify
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse, TagUpdate

router = APIRouter()


@router.get("", response_model=list[TagResponse], summary="List tags")
async def list_tags(
    response: Response,
    search: str | None = Query(None, description="Search by name or slug"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Tag)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Tag.name.ilike(search_pattern)) | (Tag.slug.ilike(search_pattern))
        )
    query = query.order_by(Tag.name)
    tags, total = await fetch_page(db, query, skip, limit)
    set_pagination_headers(response, total, skip, limit)
    return [TagResponse.model_validate(tag) for tag in tags]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED, summary="Create tag")
async def create_tag(
    request: Request,
    tag_in: TagCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('tag', 'create')),
):
    slug = tag_in.slug or slugify(tag_in.name)
    existing = await db.execute(select(Tag).where(Tag.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tag with this slug already exists",
        )

    tag = Tag(slug=slug, **tag_in.model_dump(exclude={"slug"}))
    db.add(tag)
    await db.flush()
    await db.refresh(tag)

    await log_audit(db, tenant_id, current_user.id, "create", "tag", str(tag.id),
                    new_value=tag.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return TagResponse.model_validate(tag)


@router.get("/{tag_id}", response_model=TagResponse, summary="Get tag by ID")
async def get_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return TagResponse.model_validate(tag)


@router.put("/{tag_id}", response_model=TagResponse, summary="Update tag")
async def update_tag(
    request: Request,
    tag_id: UUID,
    tag_in: TagUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('tag', 'update')),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    update_data = tag_in.model_dump(exclude_unset=True)
    if "slug" in update_data and not update_data["slug"]:
        update_data["slug"] = slugify(update_data.get("name") or tag.name)
    for field, value in update_data.items():
        setattr(tag, field, value)

    db.add(tag)
    await db.flush()
    await db.refresh(tag)

    await log_audit(db, tenant_id, current_user.id, "update", "tag", str(tag.id),
                    new_value=tag.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return TagResponse.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete tag")
async def delete_tag(
    request: Request,
    tag_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(require_permission('tag', 'delete')),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "tag", str(tag_id),
                    old_value=tag.name, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(tag)
    await db.flush()
