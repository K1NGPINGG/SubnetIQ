"""SubnetIQ FastAPI Application Entry Point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine
from app.core.rate_limit import limiter
from app.api.v1.router import api_router
from app.middleware.audit import AuditMiddleware
from app.middleware.api_logging import APIRequestLoggingMiddleware
from app.middleware.tenant import TenantMiddleware
from app.seed import seed_database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup: seed database
    logger.info("Running database seed...")
    await seed_database()
    logger.info("Startup complete")
    yield
    # Shutdown
    await engine.dispose()


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    is_production = not settings.DEBUG

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if not is_production else None,
        docs_url="/docs" if not is_production else None,
        redoc_url="/redoc" if not is_production else None,
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # Rate limiter
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS Middleware — restrict origins
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Tenant-ID"],
    )

    # Custom Middleware
    application.add_middleware(APIRequestLoggingMiddleware)
    application.add_middleware(AuditMiddleware)
    application.add_middleware(TenantMiddleware)

    # Include API Router
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return application


app = create_application()
