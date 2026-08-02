"""Tenant branding service for customization."""


from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant


class BrandingService:
    """Service for managing tenant branding and customization."""

    async def get_tenant_branding(
        self,
        tenant_id: str,
        db: AsyncSession,
    ) -> dict:
        """Get branding configuration for a tenant."""
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()

        if tenant is None:
            return self._default_branding()

        return {
            "tenant_id": str(tenant.id),
            "name": tenant.name,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color or "#1976D2",
            "favicon_url": f"/api/v1/branding/{tenant.id}/favicon",
        }

    async def update_tenant_branding(
        self,
        tenant_id: str,
        logo_url: str | None = None,
        primary_color: str | None = None,
        db: AsyncSession | None = None,
    ) -> dict:
        """Update branding configuration for a tenant."""
        if db is None:
            raise ValueError("Database session is required")
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()

        if tenant is None:
            raise ValueError("Tenant not found")

        if logo_url is not None:
            tenant.logo_url = logo_url
        if primary_color is not None:
            tenant.primary_color = primary_color

        db.add(tenant)
        await db.flush()
        await db.refresh(tenant)

        return self._format_branding(tenant)

    def _format_branding(self, tenant: Tenant) -> dict:
        """Format tenant branding data."""
        return {
            "tenant_id": str(tenant.id),
            "name": tenant.name,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color or "#1976D2",
        }

    def _default_branding(self) -> dict:
        """Return default branding configuration."""
        return {
            "tenant_id": None,
            "name": "GG_IPAM",
            "logo_url": None,
            "primary_color": "#1976D2",
        }


branding_service = BrandingService()
