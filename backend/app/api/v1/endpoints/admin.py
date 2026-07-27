"""Admin endpoints - user management and integrations."""

import re
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.core.ip_utils import get_client_ip
from app.api.deps import get_current_admin_user, validate_tenant_access
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.audit import log_audit

ALLOWED_USER_UPDATE_FIELDS = {"display_name", "role", "is_active", "mfa_enforced"}


class ResetPasswordRequest(BaseModel):
    """Request body for admin password reset."""
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            errors.append("at least one digit")
        if not re.search(r"[^A-Za-z0-9]", v):
            errors.append("at least one special character")
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v


router = APIRouter()


# -- Users -------------------------------------------------------------------


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    data: UserCreate,
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    existing = await db.execute(
        select(User).where(User.email == data.email, User.tenant_id == tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered in this tenant")

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        role=data.role or "viewer",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await log_audit(db, tenant_id, current_user.id, "create", "user", str(user.id),
                    new_value=f"{user.email} ({user.role})",
                    user_email=current_user.email, user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: UUID,
    data: UserUpdate,
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    new_password = update_data.pop("password", None)

    # Only allow whitelisted fields — prevent mass assignment
    for field, value in update_data.items():
        if field in ALLOWED_USER_UPDATE_FIELDS:
            setattr(user, field, value)

    if new_password:
        import re as _re
        errors = []
        if len(new_password) < 8:
            errors.append("at least 8 characters")
        if not _re.search(r"[A-Z]", new_password):
            errors.append("at least one uppercase letter")
        if not _re.search(r"[a-z]", new_password):
            errors.append("at least one lowercase letter")
        if not _re.search(r"[0-9]", new_password):
            errors.append("at least one digit")
        if not _re.search(r"[^A-Za-z0-9]", new_password):
            errors.append("at least one special character")
        if errors:
            raise HTTPException(
                status_code=400,
                detail=f"Password must contain {', '.join(errors)}",
            )
        user.hashed_password = hash_password(new_password)

    await db.commit()
    await db.refresh(user)

    await log_audit(db, tenant_id, current_user.id, "update", "user", str(user.id),
                    new_value=user.email, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return user


@router.delete("/users/{user_id}")
async def delete_user(
    request: Request,
    user_id: UUID,
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await log_audit(db, tenant_id, current_user.id, "delete", "user", str(user_id),
                    old_value=user.email, user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    request: Request,
    user_id: UUID,
    body: ResetPasswordRequest,
    tenant_id: UUID = Depends(validate_tenant_access),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.password)
    await db.commit()

    await log_audit(db, tenant_id, current_user.id, "reset_password", "user", str(user_id),
                    new_value=f"Password reset for {user.email}",
                    user_email=current_user.email,
                    user_name=current_user.display_name,
                    ip_address=get_client_ip(request))

    return {"message": "Password updated"}
