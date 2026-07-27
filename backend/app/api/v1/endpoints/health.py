"""Health check endpoints."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("", summary="Basic health check")
async def health_check():
    """Return basic health status."""
    return {"status": "healthy", "service": "SubnetIQ"}


@router.get("/db", summary="Database health check")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Verify database connectivity."""
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logging.getLogger(__name__).error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "database": "connection failed"}
