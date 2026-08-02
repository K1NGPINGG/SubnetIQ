"""SNMP Credential schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SNMPCredentialBase(BaseModel):
    """Base SNMP credential schema."""
    name: str
    version: str = "v2c"
    community_string: str | None = None
    v3_username: str | None = None
    v3_auth_protocol: str | None = None
    v3_auth_passphrase: str | None = None
    v3_priv_protocol: str | None = None
    v3_priv_passphrase: str | None = None
    v3_security_level: str | None = None


class SNMPCredentialCreate(SNMPCredentialBase):
    """Schema for creating an SNMP credential."""
    pass


class SNMPCredentialUpdate(BaseModel):
    """Schema for updating an SNMP credential."""
    name: str | None = None
    version: str | None = None
    community_string: str | None = None
    v3_username: str | None = None
    v3_auth_protocol: str | None = None
    v3_auth_passphrase: str | None = None
    v3_priv_protocol: str | None = None
    v3_priv_passphrase: str | None = None
    v3_security_level: str | None = None
    is_active: bool | None = None


class SNMPCredentialResponse(BaseModel):
    """Schema for SNMP credential response (masks secrets)."""
    id: UUID
    tenant_id: UUID
    name: str
    version: str
    community_string: str | None = None
    v3_username: str | None = None
    v3_auth_protocol: str | None = None
    v3_auth_passphrase: str | None = None
    v3_priv_protocol: str | None = None
    v3_priv_passphrase: str | None = None
    v3_security_level: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, obj):
        """Create response, masking encrypted fields."""
        data = cls.model_validate(obj)
        # Mask all sensitive fields
        if data.community_string:
            data.community_string = "********"
        if data.v3_auth_passphrase:
            data.v3_auth_passphrase = "********"
        if data.v3_priv_passphrase:
            data.v3_priv_passphrase = "********"
        return data
