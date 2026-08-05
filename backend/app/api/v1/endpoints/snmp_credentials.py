"""SNMP Credential management endpoints."""

from uuid import UUIDfrom fastapi import APIRouter, Depends, HTTPException, statusfrom sqlalchemy import selectfrom sqlalchemy.ext.asyncio import AsyncSessionfrom app.api.deps import get_current_admin_user, validate_tenant_accessfrom app.core.database import get_dbfrom app.models.snmp_credential import SNMPCredentialfrom app.models.user import Userfrom app.schemas.snmp_credential import (    SNMPCredentialCreate,    SNMPCredentialResponse,    SNMPCredentialUpdate,)router = APIRouter(redirect_slashes=False)


@router.get("", response_model=list[SNMPCredentialResponse])
async def list_snmp_credentials(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """List all SNMP credentials for the current tenant."""
    result = await db.execute(
        select(SNMPCredential)
        .where(SNMPCredential.tenant_id == tenant_id)
        .order_by(SNMPCredential.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SNMPCredentialResponse, status_code=status.HTTP_201_CREATED)
async def create_snmp_credential(
    data: SNMPCredentialCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new SNMP credential profile."""
    cred = SNMPCredential(
        tenant_id=tenant_id,
        name=data.name,
        version=data.version,
        community_string=data.community_string,
        v3_username=data.v3_username,
        v3_auth_protocol=data.v3_auth_protocol,
        v3_auth_passphrase=data.v3_auth_passphrase,
        v3_priv_protocol=data.v3_priv_protocol,
        v3_priv_passphrase=data.v3_priv_passphrase,
        v3_security_level=data.v3_security_level,
        is_active=True,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.get("/{cred_id}", response_model=SNMPCredentialResponse)
async def get_snmp_credential(
    cred_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific SNMP credential."""
    result = await db.execute(
        select(SNMPCredential).where(
            SNMPCredential.id == cred_id,
            SNMPCredential.tenant_id == tenant_id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="SNMP credential not found")
    return cred


@router.put("/{cred_id}", response_model=SNMPCredentialResponse)
async def update_snmp_credential(
    cred_id: UUID,
    data: SNMPCredentialUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Update an SNMP credential."""
    result = await db.execute(
        select(SNMPCredential).where(
            SNMPCredential.id == cred_id,
            SNMPCredential.tenant_id == tenant_id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="SNMP credential not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cred, field, value)

    await db.commit()
    await db.refresh(cred)
    return cred


@router.delete("/{cred_id}")
async def delete_snmp_credential(
    cred_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(validate_tenant_access),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete an SNMP credential."""
    result = await db.execute(
        select(SNMPCredential).where(
            SNMPCredential.id == cred_id,
            SNMPCredential.tenant_id == tenant_id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="SNMP credential not found")

    await db.delete(cred)
    await db.commit()
    return {"message": "SNMP credential deleted"}
