"""LDAP authentication service."""

import logging

from ldap3 import ALL, NTLM, SUBTREE, Connection, Server
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)


class LDAPService:
    """Service for LDAP authentication and user provisioning."""

    def __init__(self):
        self.server_url = settings.LDAP_SERVER
        self.base_dn = settings.LDAP_BASE_DN
        self.bind_dn = settings.LDAP_BIND_DN
        self.bind_password = settings.LDAP_BIND_PASSWORD
        self.user_search_base = settings.LDAP_USER_SEARCH_BASE

    def _get_connection(self) -> Connection:
        """Create an LDAP connection with service account credentials."""
        server = Server(self.server_url, get_info=ALL)
        conn = Connection(
            server,
            user=self.bind_dn,
            password=self.bind_password,
            authentication=NTLM,
            auto_bind=True,
        )
        return conn

    def authenticate(self, username: str, password: str) -> dict | None:
        """
        Authenticate a user against LDAP and return their profile info.

        Args:
            username: The username (sAMAccountName or uid) to authenticate.
            password: The user's password.

        Returns:
            User info dict if authentication succeeds, None otherwise.
        """
        try:
            # First bind with service account to search for the user
            conn = self._get_connection()

            # Search for the user
            search_filter = f"(sAMAccountName={username})"
            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=["cn", "mail", "displayName", "memberOf", "distinguishedName"],
            )

            if not conn.entries:
                logger.warning(f"LDAP user not found: {username}")
                conn.unbind()
                return None

            user_entry = conn.entries[0]
            user_dn = user_entry.distinguishedName.value

            # Attempt to bind with the user's credentials
            user_conn = Connection(
                Server(self.server_url, get_info=ALL),
                user=user_dn,
                password=password,
                auto_bind=True,
            )

            # If we get here, authentication succeeded
            user_info = {
                "username": username,
                "email": user_entry.mail.value if hasattr(user_entry, "mail") else f"{username}@{self.base_dn.replace('dc=', '').replace(',', '.')}",
                "display_name": user_entry.cn.value if hasattr(user_entry, "cn") else username,
                "dn": user_dn,
                "groups": [
                    str(group) for group in (user_entry.memberOf.values if hasattr(user_entry, "memberOf") else [])
                ],
            }

            user_conn.unbind()
            conn.unbind()
            return user_info

        except Exception as e:
            logger.error(f"LDAP authentication error for user {username}: {str(e)}")
            return None

    async def get_or_create_user(
        self,
        db: AsyncSession,
        username: str,
        email: str,
        display_name: str,
        ldap_dn: str,
    ) -> User:
        """Get an existing user or create a new one from LDAP data."""
        # Check if user exists by email
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if user:
            user.ldap_dn = ldap_dn
            user.is_active = True
            db.add(user)
            await db.flush()
            return user

        # Get default tenant
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.is_active)
        )
        default_tenant = tenant_result.scalars().first()

        if default_tenant is None:
            default_tenant = Tenant(
                name="Default Organization",
                slug="default",
                is_active=True,
            )
            db.add(default_tenant)
            await db.flush()

        # Determine role from LDAP groups (override as needed)
        role = "viewer"

        user = User(
            tenant_id=default_tenant.id,
            email=email,
            display_name=display_name,
            role=role,
            is_active=True,
            ldap_dn=ldap_dn,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        logger.info(f"Created new user from LDAP: {email}")
        return user


ldap_service = LDAPService()
