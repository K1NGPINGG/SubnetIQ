"""Backup & restore endpoints (admin only)."""

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import get_current_admin_user
from app.models.user import User
from app.services.backup import BACKUP_DIR, delete_backup, list_backups
from app.tasks.worker import run_backup, run_restore

router = APIRouter()


@router.get("", summary="List backups")
async def backups_list(current_user: User = Depends(get_current_admin_user)):
    """List locally stored backup archives."""
    return {"backups": list_backups()}


@router.post("/create", status_code=202, summary="Create a new backup")
async def backups_create(current_user: User = Depends(get_current_admin_user)):
    """Trigger a Celery task that creates a full backup archive."""
    task = run_backup.delay(kind="manual")
    return {"accepted": True, "task_id": task.id}


@router.get("/{filename}/download", summary="Download a backup")
async def backups_download(
    filename: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Download a stored backup archive."""
    if "/" in filename or "\\" in filename or not filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Invalid backup filename")
    p = BACKUP_DIR / filename
    if not p.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    return FileResponse(p, media_type="application/gzip", filename=filename)


@router.delete("/{filename}", status_code=204, summary="Delete a backup")
async def backups_delete(
    filename: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a stored backup archive."""
    try:
        delete_backup(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return None


@router.post("/restore", status_code=202, summary="Restore from an uploaded backup")
async def backups_restore(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
):
    """Accept an uploaded ``.tar.gz`` backup and trigger a restore task (destructive)."""
    filename = (file.filename or "upload.tar.gz").replace("\\", "/").split("/")[-1]
    if not filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Only .tar.gz backups are supported")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stage = BACKUP_DIR / f".restore-stage-{filename}"
    with stage.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    task = run_restore.delay(stage.name)
    return {"accepted": True, "task_id": task.id, "filename": filename}
