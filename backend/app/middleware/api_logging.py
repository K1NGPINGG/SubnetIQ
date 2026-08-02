"""Middleware for logging API requests and errors."""

import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse


class APIRequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs API requests, response times, and errors to the database."""

    async def dispatch(self, request: Request, call_next) -> StarletteResponse:
        # Skip health checks and docs
        path = request.url.path
        if path in ("/health", "/docs", "/redoc", "/openapi.json") or path.startswith("/docs"):
            return await call_next(request)

        start_time = time.time()
        response = None
        error_message = None
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            error_message = str(e)
            status_code = 500
            raise
        finally:
            duration_ms = int((time.time() - start_time) * 1000)

            # Only log errors and slow requests (>2s)
            if status_code >= 400 or duration_ms > 2000:
                try:

                    from app.core.database import async_session_factory
                    from app.models.system_log import SystemLog

                    level = "error" if status_code >= 500 else "warning" if status_code >= 400 else "info"
                    category = "api"
                    message = f"{request.method} {path} -> {status_code} ({duration_ms}ms)"

                    details = None
                    if error_message:
                        details = error_message
                    elif status_code >= 400:
                        details = f"HTTP {status_code}"

                    # Get tenant_id from request state if available
                    tenant_id = getattr(request.state, "tenant_id", None)

                    async with async_session_factory() as db:
                        log_entry = SystemLog(
                            level=level,
                            category=category,
                            message=message,
                            details=details,
                            source="api",
                            duration_ms=duration_ms,
                            ip_address=request.client.host if request.client else None,
                            tenant_id=tenant_id,
                        )
                        db.add(log_entry)
                        await db.commit()
                except Exception:
                    # Don't let logging errors break the request
                    pass

        return response
