"""WinRM Credential management endpoints."""



from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, validate_tenant_access
from app.core.database import get_db
from app.models.user import User
from app.models.winrm_credential import WinRMCredential
from app.schemas.winrm_credential import (
    WinRMCredentialCreate,
    WinRMCredentialResponse,
    WinRMCredentialUpdate,
)

router = APIRouter()





@router.get("", response_model=list[WinRMCredentialResponse])

async def list_winrm_credentials(

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_admin_user),

):

    """List all WinRM credentials for the current tenant."""

    result = await db.execute(

        select(WinRMCredential)

        .where(WinRMCredential.tenant_id == tenant_id)

        .order_by(WinRMCredential.created_at.desc())

    )

    return result.scalars().all()





@router.post("", response_model=WinRMCredentialResponse, status_code=status.HTTP_201_CREATED)

async def create_winrm_credential(

    data: WinRMCredentialCreate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_admin_user),

):

    """Create a new WinRM credential profile."""

    cred = WinRMCredential(

        tenant_id=tenant_id,

        name=data.name,

        username=data.username,

        password=data.password,

        port=data.port,

        use_ssl=data.use_ssl,

        auth_type=data.auth_type,

        domain=data.domain,

        is_active=True,

    )

    db.add(cred)

    await db.commit()

    await db.refresh(cred)

    return cred





@router.get("/{cred_id}", response_model=WinRMCredentialResponse)

async def get_winrm_credential(

    cred_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_admin_user),

):

    """Get a specific WinRM credential."""

    result = await db.execute(

        select(WinRMCredential).where(

            WinRMCredential.id == cred_id,

            WinRMCredential.tenant_id == tenant_id,

        )

    )

    cred = result.scalar_one_or_none()

    if not cred:

        raise HTTPException(status_code=404, detail="WinRM credential not found")

    return cred





@router.put("/{cred_id}", response_model=WinRMCredentialResponse)

async def update_winrm_credential(

    cred_id: UUID,

    data: WinRMCredentialUpdate,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_admin_user),

):

    """Update a WinRM credential."""

    result = await db.execute(

        select(WinRMCredential).where(

            WinRMCredential.id == cred_id,

            WinRMCredential.tenant_id == tenant_id,

        )

    )

    cred = result.scalar_one_or_none()

    if not cred:

        raise HTTPException(status_code=404, detail="WinRM credential not found")



    for field, value in data.model_dump(exclude_unset=True).items():

        setattr(cred, field, value)



    await db.commit()

    await db.refresh(cred)

    return cred





@router.delete("/{cred_id}")

async def delete_winrm_credential(

    cred_id: UUID,

    db: AsyncSession = Depends(get_db),

    tenant_id: UUID = Depends(validate_tenant_access),

    current_user: User = Depends(get_current_admin_user),

):

    """Delete a WinRM credential."""

    result = await db.execute(

        select(WinRMCredential).where(

            WinRMCredential.id == cred_id,

            WinRMCredential.tenant_id == tenant_id,

        )

    )

    cred = result.scalar_one_or_none()

    if not cred:

        raise HTTPException(status_code=404, detail="WinRM credential not found")



    await db.delete(cred)

    await db.commit()

    return {"message": "WinRM credential deleted"}

