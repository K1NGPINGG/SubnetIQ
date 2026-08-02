"""Authentication schemas."""

from typing import Any

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Request schema for login."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Response schema for authentication tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False
    user: Any | None = None


class TokenRefreshRequest(BaseModel):
    """Request schema for token refresh."""
    refresh_token: str


class MFASetupResponse(BaseModel):
    """Response schema for MFA setup."""
    secret: str
    provisioning_uri: str
    qr_code_url: str


class MFAVerifyRequest(BaseModel):
    """Request schema for MFA verification."""
    token: str
    code: str
