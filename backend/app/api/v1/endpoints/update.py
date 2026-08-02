"""Update endpoints - check and apply application updates from GitHub releases."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_admin_user
from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

UPDATES_DIR = Path(settings.UPDATE_DATA_DIR)
TRIGGER_FILE = UPDATES_DIR / "trigger.json"
STATE_FILE = UPDATES_DIR / "state.json"
LOG_FILE = UPDATES_DIR / "update.log"

GITHUB_RELEASES_URL = (
    f"{settings.GITHUB_API_URL}/repos/{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}/releases/latest"
)
GITHUB_TAGS_URL = (
    f"{settings.GITHUB_API_URL}/repos/{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}/tags"
)


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_version(tag: str) -> tuple[int, ...]:
    """Parse a version tag like v1.2.3 into a comparable tuple."""
    parts = []
    for part in tag.lstrip("vV").replace("-", ".").split("."):
        if part.isdigit():
            parts.append(int(part))
    return tuple(parts)


def _is_newer(latest: str, current: str) -> bool:
    return _parse_version(latest) > _parse_version(current)


def _read_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _read_log_tail(max_lines: int = 200) -> str:
    try:
        lines = LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(lines[-max_lines:])
    except Exception:
        return ""


def _write_trigger(tag: str, requested_by: str) -> None:
    UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    TRIGGER_FILE.write_text(
        json.dumps({"tag": tag, "requested_at": _now_iso(), "requested_by": requested_by}),
        encoding="utf-8",
    )


async def _get_latest_release() -> dict | None:
    """Fetch the latest GitHub release. Falls back to the newest tag if no release exists."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GITHUB_RELEASES_URL)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "tag_name": data.get("tag_name", ""),
                    "name": data.get("name", ""),
                    "published_at": data.get("published_at"),
                    "html_url": data.get("html_url", ""),
                }
            if resp.status_code == 404:
                tags = await client.get(GITHUB_TAGS_URL)
                if tags.status_code == 200:
                    data = tags.json()
                    if data:
                        return {"tag_name": data[0].get("name", ""), "name": "", "published_at": None, "html_url": ""}
            logger.warning(f"GitHub API returned {resp.status_code} for latest release")
    except Exception as e:
        logger.warning(f"Failed to fetch latest release from GitHub: {e}")
    return None


class UpdateRunRequest(BaseModel):
    tag: str | None = None


@router.get("/status")
async def update_status(
    current_user: User = Depends(get_current_admin_user),
):
    """Report current version, latest available release, and updater state."""
    if not settings.UPDATE_ENABLED:
        return {"enabled": False, "message": "Updates are disabled in configuration"}

    latest = await _get_latest_release()
    current_version = settings.APP_VERSION
    update_available = False
    if latest:
        update_available = _is_newer(latest["tag_name"], current_version)

    return {
        "enabled": True,
        "current_version": current_version,
        "latest_release": latest,
        "update_available": update_available,
        "state": _read_state(),
        "log_tail": _read_log_tail(),
    }


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
async def run_update(
    data: UpdateRunRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """Trigger the updater to apply a release tag."""
    if not settings.UPDATE_ENABLED:
        raise HTTPException(status_code=400, detail="Updates are disabled in configuration")

    if TRIGGER_FILE.exists():
        raise HTTPException(status_code=409, detail="An update is already in progress")

    target_tag = data.tag
    if not target_tag:
        latest = await _get_latest_release()
        if not latest or not latest.get("tag_name"):
            raise HTTPException(status_code=400, detail="No release tag specified and no latest release found")
        target_tag = latest["tag_name"]

    _write_trigger(target_tag, requested_by=current_user.email)
    return {"accepted": True, "tag": target_tag, "triggered_at": _now_iso()}
