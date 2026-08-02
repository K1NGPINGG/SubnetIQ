"""Tenant resolution middleware."""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.tenant import reset_current_tenant_id, set_current_tenant_id

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts and sets the tenant context for each request.

    The tenant_id is extracted from the JWT token payload (sub/tenant_id claims)
    and stored in a context variable for use throughout the request lifecycle.
    """

    # Paths that do not require tenant context
    EXEMPT_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/health",
        "/api/v1/health/db",
    }

    async def dispatch(self, request: Request, call_next):
        """Process the request, extracting tenant context from the JWT token."""
        path = request.url.path

        # Skip tenant resolution for exempt paths
        if path in self.EXEMPT_PATHS or path.startswith("/docs") or path.startswith("/redoc"):
            return await call_next(request)

        # Try to extract tenant_id from the Authorization header
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                import jwt

                from app.core.config import settings

                token = auth_header[7:]
                payload = jwt.decode(
                    token,
                    settings.JWT_SECRET_KEY,
                    algorithms=[settings.JWT_ALGORITHM],
                )
                tenant_id = payload.get("tenant_id")
                if tenant_id:
                    from uuid import UUID
                    set_current_tenant_id(UUID(tenant_id))
                else:
                    reset_current_tenant_id()
            else:
                reset_current_tenant_id()
        except Exception:
            # If token parsing fails, just reset - the auth dependency will handle errors
            reset_current_tenant_id()

        try:
            response = await call_next(request)
            return response
        finally:
            reset_current_tenant_id()
