"""Authentication endpoints: login, token refresh, MFA setup/verify, user info."""

import re

from typing import Optional

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import (
    TokenRefreshRequest,
    TokenResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    LoginRequest,
)


router = APIRouter()

_PASSWORD_MIN_LENGTH = 8


def _validate_password_strength(password: str) -> None:
    """Enforce minimum password complexity requirements."""
    errors = []
    if len(password) < _PASSWORD_MIN_LENGTH:
        errors.append(f"at least {_PASSWORD_MIN_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        errors.append("at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("at least one lowercase letter")
    if not re.search(r"[0-9]", password):
        errors.append("at least one digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("at least one special character")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must contain {', '.join(errors)}",
        )


class ChangePasswordRequest(BaseModel):
    """Request body for password change."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        _validate_password_strength(v)
        return v


class MFADisableRequest(BaseModel):
    """Request body for MFA disable (requires TOTP verification)."""
    code: str


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse, summary="Login with email/password")
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate a user with email and password, returning JWT tokens."""
    result = await db.execute(
        select(User).where(User.email == login_req.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    # Constant-time comparison to prevent timing attacks on user enumeration
    if user is None:
        # Still hash a dummy password to prevent timing-based enumeration
        verify_password(login_req.email, "$2b$12$dummyhashtopreventtimingattack")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if MFA is enabled
    if user.mfa_enabled:
        temp_token = create_access_token(
            data={"sub": str(user.id), "tenant_id": str(user.tenant_id), "mfa_pending": True},
            expires_delta=__import__("datetime").timedelta(minutes=5),
        )
        return TokenResponse(
            access_token=temp_token,
            refresh_token="",
            token_type="bearer",
            requires_mfa=True,
            user=None,
        )

    # No MFA — issue full tokens
    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        requires_mfa=False,
        user={
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "tenant_id": str(user.tenant_id),
        },
    )


# ---------------------------------------------------------------------------
# MFA Verify
# ---------------------------------------------------------------------------

@router.post("/mfa/verify", response_model=TokenResponse, summary="Verify MFA code")
@limiter.limit("5/minute")
async def verify_mfa(
    request: Request,
    mfa_req: MFAVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify a TOTP MFA code and complete the login process."""
    payload = decode_token(mfa_req.token)

    if not payload.get("mfa_pending"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is not a MFA-pending token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not configured for this user",
        )

    # Verify the TOTP code
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(mfa_req.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    # Issue full tokens
    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        requires_mfa=False,
        user={
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "tenant_id": str(user.tenant_id),
        },
    )


# ---------------------------------------------------------------------------
# Refresh Token
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    token_req: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access/refresh token pair."""
    payload = decode_token(token_req.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type, expected refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        requires_mfa=False,
        user={
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "tenant_id": str(user.tenant_id),
        },
    )


# ---------------------------------------------------------------------------
# MFA Setup
# ---------------------------------------------------------------------------

@router.post("/mfa/setup", response_model=MFASetupResponse, summary="Setup MFA for current user")
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new TOTP secret and provisioning URI for the current user."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)

    current_user.mfa_secret = secret
    db.add(current_user)
    await db.flush()

    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="SubnetIQ",
    )

    return MFASetupResponse(
        secret=secret,
        provisioning_uri=provisioning_uri,
        qr_code_url=f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={provisioning_uri}",
    )


# ---------------------------------------------------------------------------
# MFA Enable
# ---------------------------------------------------------------------------

@router.post("/mfa/enable", summary="Enable MFA after setup verification")
async def enable_mfa(
    mfa_req: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable MFA for the current user after verifying a TOTP code."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated. Call /mfa/setup first.",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(mfa_req.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code. Please try again.",
        )

    current_user.mfa_enabled = True
    db.add(current_user)
    await db.flush()

    return {"message": "MFA has been enabled successfully"}


# ---------------------------------------------------------------------------
# MFA Disable — NOW REQUIRES TOTP CODE VERIFICATION
# ---------------------------------------------------------------------------

@router.post("/mfa/disable", summary="Disable MFA for current user")
async def disable_mfa(
    disable_req: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable MFA for the current user. Requires TOTP code verification."""
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not currently enabled",
        )

    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA secret not configured",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(disable_req.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code. Cannot disable MFA without verification.",
        )

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.add(current_user)
    await db.flush()

    return {"message": "MFA has been disabled successfully"}


# ---------------------------------------------------------------------------
# Change Password — body not query params, with complexity validation
# ---------------------------------------------------------------------------

@router.post("/change-password", summary="Change current user password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password after verifying the old password."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Password complexity already validated by Pydantic field_validator
    current_user.hashed_password = hash_password(body.new_password)
    db.add(current_user)
    await db.flush()

    return {"message": "Password changed successfully"}


# ---------------------------------------------------------------------------
# Current User Info
# ---------------------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    """Request body for updating own profile."""
    display_name: Optional[str] = None
    email: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v is not None and ("@" not in v or "." not in v):
            raise ValueError("Invalid email address")
        return v


@router.get("/me", summary="Get current user info")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's information."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "display_name": current_user.display_name,
        "role": current_user.role,
        "tenant_id": str(current_user.tenant_id),
        "mfa_enabled": current_user.mfa_enabled,
        "mfa_enforced": current_user.mfa_enforced,
        "is_active": current_user.is_active,
    }


@router.put("/me", summary="Update current user profile")
async def update_me(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's display name or email."""
    if body.email is not None and body.email != current_user.email:
        existing = await db.execute(
            select(User).where(
                User.email == body.email,
                User.id != current_user.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use",
            )
        current_user.email = body.email

    if body.display_name is not None:
        current_user.display_name = body.display_name

    db.add(current_user)
    await db.flush()

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "display_name": current_user.display_name,
        "role": current_user.role,
        "tenant_id": str(current_user.tenant_id),
        "mfa_enabled": current_user.mfa_enabled,
        "mfa_enforced": current_user.mfa_enforced,
        "is_active": current_user.is_active,
    }
