"""Audit logging middleware."""

import json
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs API request/response details for auditing.

    Captures method, path, status code, response time, and client IP.
    """

    # Paths to exclude from audit logging
    EXEMPT_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    async def dispatch(self, request: Request, call_next):
        """Log request/response details for audit purposes."""
        path = request.url.path

        # Skip exempt paths
        if path in self.EXEMPT_PATHS or path.startswith("/docs") or path.startswith("/redoc"):
            return await call_next(request)

        # Record start time
        start_time = time.time()

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        # Get user agent
        user_agent = request.headers.get("User-Agent", "unknown")

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log the error
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                json.dumps({
                    "method": request.method,
                    "path": path,
                    "status_code": 500,
                    "duration_ms": round(duration_ms, 2),
                    "client_ip": client_ip,
                    "error": str(exc),
                })
            )
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log audit info
        log_data = {
            "method": request.method,
            "path": path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
            "client_ip": client_ip,
            "user_agent": user_agent,
        }

        if response.status_code >= 400:
            logger.warning(json.dumps(log_data))
        else:
            logger.info(json.dumps(log_data))

        return response
