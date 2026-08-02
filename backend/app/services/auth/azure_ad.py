"""Azure AD (Entra ID) authentication service."""

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)

AZURE_AD_DISCOVERY_URL = (
    "https://login.microsoftonline.com/{tenant_id}/v2.0/.well-known/openid-configuration"
)
AZURE_AD_JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys"
AZURE_AD_TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
AZURE_AD_USERINFO_URL = "https://graph.microsoft.com/v1.0/me"


class AzureADService:
    """Service for handling Azure AD authentication and user provisioning."""

    def __init__(self):
        self.tenant_id = settings.AZURE_TENANT_ID
        self.client_id = settings.AZURE_CLIENT_ID
        self.client_secret = settings.AZURE_CLIENT_SECRET

    async def get_openid_config(self) -> dict:
        """Fetch OpenID Connect configuration from Azure AD."""
        url = AZURE_AD_DISCOVERY_URL.format(tenant_id=self.tenant_id)
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
        """Exchange an authorization code for access and ID tokens."""
        config = await self.get_openid_config()
        token_url = config["token_endpoint"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_user_info(self, access_token: str) -> dict:
        """Fetch user profile information from Microsoft Graph."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                AZURE_AD_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    async def get_or_create_user(
        self,
        db: AsyncSession,
        azure_ad_id: str,
        email: str,
        display_name: str,
    ) -> User:
        """Get an existing user by Azure AD ID or create a new one."""
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.azure_ad_id == azure_ad_id)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update user info if needed
            user.email = email
            user.display_name = display_name
            user.is_active = True
            db.add(user)
            await db.flush()
            return user

        # For new users, we need a default tenant
        # In production, you'd determine the tenant from the Azure AD domain
        tenant_result = await db.execute(select(Tenant).where(Tenant.is_active))
        default_tenant = tenant_result.scalars().first()

        if default_tenant is None:
            # Create a default tenant
            default_tenant = Tenant(
                name="Default Organization",
                slug="default",
                is_active=True,
            )
            db.add(default_tenant)
            await db.flush()

        # Create new user
        user = User(
            tenant_id=default_tenant.id,
            azure_ad_id=azure_ad_id,
            email=email,
            display_name=display_name,
            role="viewer",
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        logger.info(f"Created new user from Azure AD: {email}")
        return user


azure_ad_service = AzureADService()
