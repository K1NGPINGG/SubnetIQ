"""MFA (Multi-Factor Authentication) service using TOTP."""

import logging

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)


class MFAService:
    """Service for MFA operations using TOTP (Time-based One-Time Password)."""

    def generate_secret(self) -> str:
        """Generate a new TOTP secret."""
        return pyotp.random_base32()

    def get_totp(self, secret: str) -> pyotp.TOTP:
        """Create a TOTP instance from a secret."""
        return pyotp.TOTP(secret)

    def get_provisioning_uri(self, email: str, secret: str) -> str:
        """Generate a provisioning URI for QR code generation."""
        totp = self.get_totp(secret)
        return totp.provisioning_uri(name=email, issuer_name="GG_IPAM")

    def verify_code(self, secret: str, code: str, valid_window: int = 1) -> bool:
        """
        Verify a TOTP code against the secret.

        Args:
            secret: The user's TOTP secret.
            code: The code to verify.
            valid_window: Number of time steps to allow for clock skew.

        Returns:
            True if the code is valid, False otherwise.
        """
        try:
            totp = self.get_totp(secret)
            return totp.verify(code, valid_window=valid_window)
        except Exception as e:
            logger.error(f"MFA verification error: {str(e)}")
            return False

    def get_current_code(self, secret: str) -> str:
        """Get the current TOTP code (useful for testing)."""
        totp = self.get_totp(secret)
        return totp.now()

    async def setup_mfa(self, user: User, db: AsyncSession) -> dict:
        """
        Set up MFA for a user. Generates a new secret and returns provisioning info.
        The secret is saved but MFA is not yet enabled until verified.
        """
        secret = self.generate_secret()
        provisioning_uri = self.get_provisioning_uri(user.email, secret)

        # Save secret to user (not yet enabled)
        user.mfa_secret = secret
        db.add(user)
        await db.flush()

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={provisioning_uri}",
        }

    async def enable_mfa(self, user: User, code: str, db: AsyncSession) -> bool:
        """
        Enable MFA for a user after verifying the initial TOTP code.

        Returns:
            True if MFA was successfully enabled.
        """
        if not user.mfa_secret:
            logger.warning(f"Cannot enable MFA for user {user.id}: no secret configured")
            return False

        if not self.verify_code(user.mfa_secret, code):
            logger.warning(f"MFA enable failed for user {user.id}: invalid code")
            return False

        user.mfa_enabled = True
        db.add(user)
        await db.flush()

        logger.info(f"MFA enabled for user {user.id}")
        return True

    async def disable_mfa(self, user: User, db: AsyncSession) -> bool:
        """Disable MFA for a user."""
        user.mfa_enabled = False
        user.mfa_secret = None
        db.add(user)
        await db.flush()

        logger.info(f"MFA disabled for user {user.id}")
        return True

    async def verify_and_login(self, user: User, code: str, db: AsyncSession) -> bool:
        """
        Verify a TOTP code during login.

        Returns:
            True if verification succeeds.
        """
        if not user.mfa_enabled or not user.mfa_secret:
            logger.warning(f"MFA verification attempted for user {user.id} without MFA enabled")
            return False

        if not self.verify_code(user.mfa_secret, code):
            logger.warning(f"MFA login verification failed for user {user.id}")
            return False

        return True


mfa_service = MFAService()
