"""Seed script: create default tenant and admin user on first startup."""

import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)


async def seed_database():
    """Create default tenant and admin user if they don't exist."""
    async with async_session_factory() as db:
        try:
            # Check if default tenant exists
            result = await db.execute(
                select(Tenant).where(Tenant.slug == "default")
            )
            tenant = result.scalar_one_or_none()

            if tenant is None:
                tenant = Tenant(
                    id=uuid.uuid4(),
                    name="Default Organization",
                    slug="default",
                    primary_color="#1976D2",
                    is_active=True,
                )
                db.add(tenant)
                await db.flush()
                logger.info("Created default tenant")

            # Check if admin user exists
            result = await db.execute(
                select(User).where(User.email == settings.SUPERADMIN_EMAIL)
            )
            admin = result.scalar_one_or_none()

            if admin is None:
                admin = User(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    email=settings.SUPERADMIN_EMAIL,
                    display_name="Administrator",
                    hashed_password=hash_password(settings.SUPERADMIN_PASSWORD),
                    role="admin",
                    is_active=True,
                    mfa_enabled=False,
                )
                db.add(admin)
                await db.flush()
                logger.info("Created admin user: %s", settings.SUPERADMIN_EMAIL)

            await db.commit()
            logger.info("Database seeding complete")

        except Exception as e:
            await db.rollback()
            logger.error("Error seeding database: %s", e)
            raise
