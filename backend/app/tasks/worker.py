"""Celery worker configuration and background tasks."""

import asyncio
import contextlib
import ipaddress
import logging
import re
import socket
from datetime import UTC, datetime
from typing import Any, cast

from celery import Celery

from app.core.config import settings

logger = logging.getLogger(__name__)


def _as_probe_result(
    item: dict[str, Any] | BaseException,
) -> dict[str, Any] | None:
    """Return the dict if the gathered item is not an exception."""
    return cast(dict[str, Any], item) if not isinstance(item, BaseException) else None


# Create Celery app
celery_app = Celery(
    "subnetiq_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3000,
    worker_max_tasks_per_child=100,
    worker_prefetch_multiplier=1,
)


def get_or_create_eventloop():
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop


# ---------------------------------------------------------------------------
# Network probing helpers
# ---------------------------------------------------------------------------

async def _ping_host(host_ip: str, timeout: int = 1) -> dict:
    """Ping a single host and return result dict."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", "1", "-W", str(timeout), host_ip,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout + 2)
        output = stdout.decode("utf-8", errors="replace")

        # Parse response time from "time=1.23 ms"
        response_time_ms = None
        match = re.search(r"time[=]<(\d+\.?\d*)\s*ms|time=(\d+\.?\d*)\s*ms", output)
        if match:
            response_time_ms = float(match.group(1) or match.group(2))

        return {
            "is_alive": proc.returncode == 0,
            "response_time_ms": response_time_ms,
            "method": "icmp",
        }
    except TimeoutError:
        return {"is_alive": False, "response_time_ms": None, "method": "icmp"}
    except Exception as e:
        logger.debug(f"Ping {host_ip} failed: {e}")
        return {"is_alive": False, "response_time_ms": None, "method": "icmp"}


async def _dns_lookup(host_ip: str) -> dict:
    """Reverse DNS lookup for a host."""
    loop = asyncio.get_event_loop()
    try:
        hostname, _, _ = await loop.run_in_executor(
            None, socket.gethostbyaddr, host_ip
        )
        return {"hostname": hostname if hostname else None}
    except (socket.herror, socket.gaierror, OSError):
        return {"hostname": None}


async def _arp_lookup(host_ip: str) -> dict:
    """Get MAC address from the host's ARP table (/host/arp mounted from /proc/net/arp)."""
    try:
        loop = asyncio.get_event_loop()
        lines = await loop.run_in_executor(None, _read_arp_table)
        for line in lines:
            parts = line.split()
            if len(parts) >= 4 and parts[0] == host_ip:
                mac = parts[3]
                if mac != "00:00:00:00:00:00":
                    return {"mac_address": mac}
    except Exception:
        pass
    return {"mac_address": None}


def _read_arp_table() -> list[str]:
    """Read /host/arp or /proc/net/arp and return non-header lines."""
    arp_paths = ["/host/arp", "/proc/net/arp"]
    for path in arp_paths:
        try:
            with open(path) as f:
                lines = f.readlines()
                return [line.strip() for line in lines[1:] if line.strip()]
        except (FileNotFoundError, PermissionError):
            continue
    return []


async def _probe_host(
    host_ip: str,
    scan_type: str,
    semaphore: asyncio.Semaphore,
) -> dict:
    """Probe a single host using the specified scan type. Returns a result dict."""
    async with semaphore:
        result = {
            "address": host_ip,
            "is_alive": False,
            "response_time_ms": None,
            "hostname": None,
            "mac_address": None,
            "scan_method": scan_type,
        }

        if scan_type in ("ping", "full", "icmp", "icmp_and_snmp"):
            ping_result = await _ping_host(host_ip)
            result["is_alive"] = ping_result["is_alive"]
            result["response_time_ms"] = ping_result["response_time_ms"]

        # Always try ARP + DNS for alive hosts regardless of scan type
        if result["is_alive"] or scan_type in ("arp", "full"):
            arp_result = await _arp_lookup(host_ip)
            if arp_result["mac_address"]:
                result["mac_address"] = arp_result["mac_address"]
                if not result["is_alive"]:
                    result["is_alive"] = True  # ARP response means host is alive

        if result["is_alive"] or scan_type in ("dns", "full"):
            dns_result = await _dns_lookup(host_ip)
            if dns_result["hostname"]:
                result["hostname"] = dns_result["hostname"]

        if scan_type in ("snmp", "icmp_and_snmp", "full"):
            # SNMP scan: try connecting to UDP port 161
            # If we can send a packet without immediate rejection, mark as alive
            try:
                loop = asyncio.get_event_loop()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.settimeout(1)
                # Try SNMP GET request for sysDescr (.1.3.6.1.2.1.1.1.0)
                # Simple SNMPv2c GET request
                # Build minimal SNMP GET request
                oid_bytes = bytes([0x06, 0x0a, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00])
                snmp_body = (
                    bytes([0x02, 0x01, 0x00])  # version: v2c (1)
                    + bytes([0x04, 0x06, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x63])  # community: "public"
                    + bytes([0xa0, len(oid_bytes) + 2])  # GET request PDU
                    + bytes([0x02, 0x01, 0x00])  # request-id
                    + bytes([0x02, 0x01, 0x00])  # error-status
                    + bytes([0x02, 0x01, 0x00])  # error-index
                    + oid_bytes
                )
                snmp_packet = bytes([0x30, len(snmp_body)]) + snmp_body

                await loop.run_in_executor(
                    None,
                    lambda: sock.sendto(snmp_packet, (host_ip, 161))
                )
                # Wait for response
                data = await loop.run_in_executor(None, lambda: sock.recv(1024))
                if data:
                    result["is_alive"] = True
                    result["scan_method"] = "snmp"
            except (TimeoutError, OSError, Exception):
                # Preserve aliveness already established by ping/ARP for combined scans
                if scan_type == "snmp":
                    result["is_alive"] = False
            finally:
                with contextlib.suppress(Exception):
                    sock.close()

        return result


async def _run_discovery_scan_async(scan_id: str):
    """Async implementation of the discovery scan with real network probes."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.discovery import DiscoveryScan
    from app.models.ip_address import IPAddress
    from app.models.subnet import Subnet

    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
            )
            scan = result.scalar_one_or_none()
            if scan is None:
                logger.error(f"Discovery scan {scan_id} not found")
                return

            scan.status = "running"
            scan.started_at = datetime.now(UTC)
            db.add(scan)
            await db.commit()

            subnet_result = await db.execute(
                select(Subnet).where(Subnet.id == scan.subnet_id)
            )
            subnet = subnet_result.scalar_one_or_none()
            if subnet is None:
                scan.status = "failed"
                scan.error_message = "Subnet not found"
                scan.completed_at = datetime.now(UTC)
                db.add(scan)
                await db.commit()
                return

            network = ipaddress.IPv4Network(
                f"{subnet.network_address}/{subnet.prefix_length}", strict=False
            )
            hosts = list(network.hosts())
            total = len(hosts)

            logger.info(
                f"Scan {scan_id}: probing {total} hosts with {scan.scan_type} scan"
            )

            # Limit concurrency to avoid flooding the network
            concurrency = min(50, total)
            semaphore = asyncio.Semaphore(concurrency)

            # Run probes concurrently
            probe_tasks = [
                _probe_host(str(host), scan.scan_type, semaphore)
                for host in hosts
            ]
            probe_results = await asyncio.gather(*probe_tasks, return_exceptions=True)

            # Load existing IP records for this tenant+subnet to enrich results
            existing_query = await db.execute(
                select(IPAddress).where(
                    IPAddress.tenant_id == scan.tenant_id,
                    IPAddress.subnet_id == scan.subnet_id,
                )
            )
            existing_ips = {
                ip.address: ip for ip in existing_query.scalars().all()
            }

            # Build final discovered_hosts list
            discovered_hosts = []
            alive_count = 0
            dead_count = 0

            for raw_probe in probe_results:
                probe = _as_probe_result(raw_probe)
                if probe is None:
                    logger.warning("Probe exception: %s", raw_probe)
                    continue

                host_ip = probe["address"]
                db_record = existing_ips.get(host_ip)

                host_entry = {
                    "address": host_ip,
                    "is_alive": probe["is_alive"],
                    "response_time_ms": probe["response_time_ms"],
                    "hostname": probe.get("hostname"),
                    "mac_address": probe.get("mac_address"),
                    "scan_method": probe.get("scan_method", scan.scan_type),
                }

                # Enrich with DB data if the IP is known in the system
                if db_record:
                    host_entry["in_database"] = True
                    host_entry["db_hostname"] = db_record.hostname
                    host_entry["db_status"] = db_record.status
                    host_entry["db_device_type"] = db_record.device_type
                    host_entry["db_assigned_to"] = db_record.assigned_to
                    # Prefer DNS/scan hostname, fall back to DB hostname
                    if not host_entry["hostname"] and db_record.hostname:
                        host_entry["hostname"] = db_record.hostname
                    if not host_entry["mac_address"] and db_record.mac_address:
                        host_entry["mac_address"] = db_record.mac_address
                else:
                    host_entry["in_database"] = False

                if probe["is_alive"]:
                    alive_count += 1
                else:
                    dead_count += 1

                discovered_hosts.append(host_entry)

            # Sort by IP address
            discovered_hosts.sort(
                key=lambda h: tuple(int(o) for o in h["address"].split("."))
            )

            scan.results = {
                "discovered_hosts": discovered_hosts,
                "total_hosts_scanned": total,
                "alive_hosts": alive_count,
                "dead_hosts": dead_count,
            }
            scan.status = "completed"
            scan.completed_at = datetime.now(UTC)
            db.add(scan)
            await db.commit()

            logger.info(
                f"Scan {scan_id} completed: {alive_count} alive, {dead_count} dead "
                f"out of {total} hosts ({scan.scan_type})"
            )

        except Exception as e:
            logger.error(f"Discovery scan {scan_id} failed: {str(e)}")
            if scan is None:
                raise
            try:
                scan.status = "failed"
                scan.error_message = str(e)
                scan.completed_at = datetime.now(UTC)
                db.add(scan)
                await db.commit()
            except Exception:
                pass
            raise


@celery_app.task(bind=True, name="tasks.run_discovery_scan")
def run_discovery_scan(self, scan_id: str):
    """Celery task to run a network discovery scan."""
    logger.info(f"Starting discovery scan task for scan_id={scan_id}")
    loop = get_or_create_eventloop()
    loop.run_until_complete(_run_discovery_scan_async(scan_id))
    return {"scan_id": scan_id, "status": "completed"}


async def _check_scheduled_scans_async():
    """Check for scheduled scans that are due and dispatch them."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.discovery import DiscoveryScan

    async with async_session_factory() as db:
        try:
            now = datetime.now(UTC)
            result = await db.execute(
                select(DiscoveryScan).where(
                    DiscoveryScan.status == "scheduled",
                    DiscoveryScan.is_scheduled,
                    DiscoveryScan.schedule_time <= now,
                )
            )
            scans = result.scalars().all()

            for scan in scans:
                logger.info(f"Dispatching scheduled scan {scan.id}")
                run_discovery_scan.delay(str(scan.id))

                if scan.is_recursive and scan.interval_minutes:
                    from datetime import timedelta
                    scan.schedule_time = now + timedelta(minutes=scan.interval_minutes)
                    scan.status = "scheduled"
                else:
                    scan.status = "pending"

                db.add(scan)

            await db.commit()
            return len(scans)

        except Exception as e:
            logger.error(f"Failed to check scheduled scans: {str(e)}")
            raise


@celery_app.task(bind=True, name="tasks.check_scheduled_scans")
def check_scheduled_scans(self):
    """Celery task to check and dispatch scheduled scans."""
    logger.info("Checking for scheduled scans")
    loop = get_or_create_eventloop()
    count = loop.run_until_complete(_check_scheduled_scans_async())
    return {"scans_dispatched": count}


async def _cleanup_expired_ips_async():
    """Async implementation of expired IP cleanup."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.ip_address import IPAddress

    async with async_session_factory() as db:
        try:
            now = datetime.now(UTC)
            result = await db.execute(
                select(IPAddress).where(
                    IPAddress.expires_at.isnot(None),
                    IPAddress.expires_at < now,
                    IPAddress.status == "allocated",
                )
            )
            expired_ips = result.scalars().all()

            count = 0
            for ip in expired_ips:
                ip.status = "available"
                ip.assigned_to = None
                ip.allocated_at = None
                ip.expires_at = None
                db.add(ip)
                count += 1

            await db.commit()
            logger.info(f"Released {count} expired IP addresses")
            return count

        except Exception as e:
            logger.error(f"Failed to cleanup expired IPs: {str(e)}")
            raise


@celery_app.task(bind=True, name="tasks.cleanup_expired_ips")
def cleanup_expired_ips(self):
    """Celery task to release expired IP address allocations."""
    logger.info("Starting expired IP cleanup task")
    loop = get_or_create_eventloop()
    count = loop.run_until_complete(_cleanup_expired_ips_async())
    return {"released_count": count}


# ---------------------------------------------------------------------------
# SNMP & WinRM Asset Discovery Tasks
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, name="tasks.run_snmp_asset_discovery")
def run_snmp_asset_discovery(self, tenant_id: str, target_ips: list, community: str = "public", scan_id: str = ""):
    """Celery task to run SNMP-based asset discovery."""
    from app.tasks.discovery import _run_snmp_discovery_async
    logger.info(f"Starting SNMP asset discovery for {len(target_ips)} targets, tenant={tenant_id}")
    loop = get_or_create_eventloop()
    loop.run_until_complete(_run_snmp_discovery_async(tenant_id, target_ips, community, scan_id or str(self.request.id or "")))
    return {"scan_id": scan_id or str(self.request.id), "status": "completed"}


@celery_app.task(bind=True, name="tasks.run_ping_asset_discovery")
def run_ping_asset_discovery(self, tenant_id: str, target_ips: list, scan_id: str = "", with_snmp: bool = False, community: str = "public"):
    """Celery task to run PING (or FULL = ping + SNMP) based asset discovery."""
    from app.tasks.discovery import _run_ping_asset_discovery_async
    logger.info(f"Starting PING/FULL asset discovery for {len(target_ips)} targets, tenant={tenant_id}")
    loop = get_or_create_eventloop()
    loop.run_until_complete(_run_ping_asset_discovery_async(tenant_id, target_ips, scan_id or str(self.request.id or ""), with_snmp, community))
    return {"scan_id": scan_id or str(self.request.id), "status": "completed"}


@celery_app.task(bind=True, name="tasks.run_winrm_asset_discovery")
def run_winrm_asset_discovery(self, tenant_id: str, target_ips: list, username: str, password: str, port: int = 5985, use_ssl: bool = False, scan_id: str = ""):
    """Celery task to run WinRM-based asset discovery."""
    from app.tasks.discovery import _run_winrm_discovery_async
    logger.info(f"Starting WinRM asset discovery for {len(target_ips)} targets, tenant={tenant_id}")
    loop = get_or_create_eventloop()
    loop.run_until_complete(_run_winrm_discovery_async(tenant_id, target_ips, username, password, port, use_ssl, scan_id or str(self.request.id or "")))
    return {"scan_id": scan_id or str(self.request.id), "status": "completed"}


# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-expired-ips-every-hour": {
        "task": "tasks.cleanup_expired_ips",
        "schedule": 3600.0,
    },
    "check-scheduled-scans-every-minute": {
        "task": "tasks.check_scheduled_scans",
        "schedule": 60.0,
    },
}
