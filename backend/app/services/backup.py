"""Backup & restore utilities built on the native PostgreSQL CLI (pg_dump/pg_restore).

Backups are stored as ``.tar.gz`` archives in ``settings.BACKUP_DIR`` containing a
custom-format PostgreSQL dump (``db.dump``) plus a ``manifest.json`` describing the
schema/app versions for compatibility checks during restore.
"""
import json
import os
import subprocess
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

from app.core.config import settings

BACKUP_DIR = Path(settings.BACKUP_DIR)
SCHEMA_VERSION = "1.0"
APP_VERSION = settings.APP_VERSION


def _pg_parts() -> dict:
    url = urlparse(settings.DATABASE_URL)
    return {
        "host": url.hostname or "localhost",
        "port": url.port or 5432,
        "user": url.username or "",
        "password": url.password or "",
        "db": (url.path or "").lstrip("/") or "",
    }


def _pg_env() -> dict:
    parts = _pg_parts()
    env = os.environ.copy()
    if parts["password"]:
        env["PGPASSWORD"] = parts["password"]
    return env


def list_backups() -> list[dict]:
    if not BACKUP_DIR.exists():
        return []
    backups = []
    for p in sorted(BACKUP_DIR.glob("*.tar.gz"), reverse=True):
        try:
            st = p.stat()
        except OSError:
            continue
        name = p.name
        backups.append(
            {
                "filename": name,
                "size": st.st_size,
                "created_at": datetime.fromtimestamp(st.st_mtime, tz=UTC).isoformat(),
                "kind": "manual" if "manual" in name else "automated",
            }
        )
    return backups


def create_backup(kind: str = "manual") -> Path:
    """Create a timestamped ``.tar.gz`` backup (pg_dump + manifest). Returns the path."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    parts = _pg_parts()
    ts = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    archive_path = BACKUP_DIR / f"backup-{ts}-{kind}.tar.gz"

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        dump_path = tmp_dir / "db.dump"
        manifest = {
            "app": "SubnetIQ",
            "app_version": APP_VERSION,
            "schema_version": SCHEMA_VERSION,
            "created_at": datetime.now(UTC).isoformat(),
            "kind": kind,
        }
        (tmp_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        cmd = [
            "pg_dump",
            "-h", parts["host"],
            "-p", str(parts["port"]),
            "-U", parts["user"],
            "-Fc", "-Z", "5",
            "-f", str(dump_path),
            parts["db"],
        ]
        subprocess.run(
            cmd, env=_pg_env(), check=True, capture_output=True, text=True, timeout=600
        )

        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(dump_path, arcname="db.dump")
            tar.add(tmp_dir / "manifest.json", arcname="manifest.json")

    return archive_path


def delete_backup(filename: str) -> bool:
    if "/" in filename or "\\" in filename or ".." in filename:
        raise ValueError("Invalid backup filename")
    p = BACKUP_DIR / filename
    if p.is_file() and p.name.endswith(".tar.gz"):
        p.unlink()
        return True
    return False


def enforce_retention() -> int:
    """Delete backups older than ``BACKUP_RETENTION_DAYS``. Returns count removed."""
    if not BACKUP_DIR.exists():
        return 0
    cutoff = datetime.now(UTC).timestamp() - (settings.BACKUP_RETENTION_DAYS * 86400)
    removed = 0
    for p in BACKUP_DIR.glob("*.tar.gz"):
        try:
            if p.stat().st_mtime < cutoff:
                p.unlink()
                removed += 1
        except OSError:
            pass
    return removed


def _version_tuple(v: str) -> tuple:
    out = []
    for part in str(v).lstrip("vV").split("."):
        if part.isdigit():
            out.append(int(part))
    return tuple(out)


def restore_backup(archive_path: Path) -> None:
    """Restore a backup archive into the database (destructive)."""
    parts = _pg_parts()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(tmp_dir)

        manifest_path = tmp_dir / "manifest.json"
        if not manifest_path.exists():
            raise ValueError("Backup archive is missing manifest.json")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        if manifest.get("schema_version") != SCHEMA_VERSION:
            raise ValueError(
                f"Backup schema version {manifest.get('schema_version')} is not compatible "
                f"with the current application ({SCHEMA_VERSION})"
            )
        if manifest.get("app_version"):
            if _version_tuple(manifest["app_version"]) > _version_tuple(APP_VERSION):
                raise ValueError(
                    "Backup was created by a newer application version and cannot be restored here"
                )

        dump_path = tmp_dir / "db.dump"
        if not dump_path.exists():
            raise ValueError("Backup archive is missing db.dump")

        # Terminate active connections so the restore is not blocked by locks.
        db = parts["db"]
        term_sql = (
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            f"WHERE datname = '{db}' AND pid <> pg_backend_pid();"
        )
        subprocess.run(
            [
                "psql", "-h", parts["host"], "-p", str(parts["port"]), "-U", parts["user"],
                "-d", "postgres", "-c", term_sql,
            ],
            env=_pg_env(), check=False, capture_output=True, text=True, timeout=60,
        )

        restore_cmd = [
            "pg_restore",
            "-h", parts["host"], "-p", str(parts["port"]), "-U", parts["user"],
            "-d", db,
            "--clean", "--if-exists", "--no-owner", "--no-privileges",
            str(dump_path),
        ]
        subprocess.run(
            restore_cmd, env=_pg_env(), check=True, capture_output=True, text=True, timeout=900
        )
