"""SNMP and WinRM asset discovery Celery tasks."""

import asyncio
import contextlib
import json
import logging
import re
import time
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID

logger = logging.getLogger(__name__)


def _as_result(
    item: dict[str, Any] | BaseException,
) -> dict[str, Any] | None:
    """Return the dict if the gathered item is not an exception."""
    return cast(dict[str, Any], item) if not isinstance(item, BaseException) else None


# ---------------------------------------------------------------------------
# WinRM Discovery (via pypsrp)
# ---------------------------------------------------------------------------
async def _snmp_get(snmp_engine, host_ip: str, community: str, oid: str, timeout: float = 2.0) -> str | None:
    """Single SNMP GET request via pysnmp v7."""
    try:
        from pysnmp.hlapi.asyncio import (
            CommunityData,
            ContextData,
            ObjectIdentity,
            ObjectType,
            UdpTransportTarget,
            getCmd,
        )
        transport = UdpTransportTarget((host_ip, 161))
        error_indication, error_status, error_index, var_binds = await getCmd(
            snmp_engine,
            CommunityData(community),
            transport,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )
        if error_indication or error_status:
            return None
        for var_bind in var_binds:
            val = var_bind[1]
            if hasattr(val, "prettyPrint"):
                return val.prettyPrint()
            return str(val)
        return None
    except ImportError:
        logger.warning("pysnmp not installed, skipping SNMP")
        return None
    except Exception as e:
        logger.warning(f"SNMP GET to {host_ip} OID={oid} failed: {e}")
        return None


async def _snmp_walk(snmp_engine, host_ip: str, community: str, oid_base: str, timeout: float = 3.0) -> dict[str, str]:
    """SNMP WALK (bulk walk) returning {oid: value} map."""
    results: dict[str, str] = {}
    try:
        from pysnmp.hlapi.asyncio import (
            CommunityData,
            ContextData,
            ObjectIdentity,
            ObjectType,
            UdpTransportTarget,
            bulkCmd,
        )
        transport = UdpTransportTarget((host_ip, 161))
        async for (error_indication, error_status, _error_index, var_binds) in bulkCmd(
            snmp_engine,
            CommunityData(community),
            transport,
            ContextData(),
            0, 50,
            ObjectType(ObjectIdentity(oid_base)),
        ):
            if error_indication or error_status:
                break
            for var_bind in var_binds:
                oid_str = str(var_bind[0])
                if not oid_str.startswith(oid_base):
                    return results
                val = var_bind[1]
                results[oid_str] = val.prettyPrint() if hasattr(val, "prettyPrint") else str(val)
    except ImportError:
        pass
    except Exception as e:
        logger.debug(f"SNMP WALK to {host_ip} OID={oid_base} failed: {e}")
    return results


def _detect_device_type(sys_descr: str, sys_object_id: str = "") -> str:
    """Heuristic to classify device type from SNMP sysDescr."""
    lower = (sys_descr or "").lower()
    if any(k in lower for k in ["router", "ios xr", "ios xe", "juniper", "mikrotik"]):
        return "Router"
    if any(k in lower for k in ["switch", "catalyst", "aruba", "ubiquiti"]):
        return "Switch"
    if any(k in lower for k in ["printer", "laserjet", "inkjet", "xerox", "ricoh", "canon"]):
        return "Printer"
    if any(k in lower for k in ["windows", "microsoft", "workstation"]):
        return "Workstation"
    if any(k in lower for k in ["linux", "ubuntu", "debian", "centos", "red hat", "vmware esx", "esxi"]):
        return "Server"
    if any(k in lower for k in ["server", "proliant", "poweredge", "thinkserver"]):
        return "Server"
    if any(k in lower for k in ["snmp agent", "net-snmp"]):
        return "Server"
    return "Unknown"


def _parse_manufacturer_model(sys_descr: str) -> tuple[str | None, str | None]:
    """Try to extract manufacturer and model from sysDescr."""
    lower = (sys_descr or "").lower()
    if "cisco" in lower:
        return "Cisco", sys_descr[:200] if sys_descr else None
    if "juniper" in lower:
        return "Juniper", sys_descr[:200] if sys_descr else None
    if "mikrotik" in lower:
        return "MikroTik", sys_descr[:200] if sys_descr else None
    if "hp" in lower or "hewlett" in lower:
        return "HP/HPE", sys_descr[:200] if sys_descr else None
    if "dell" in lower:
        return "Dell", sys_descr[:200] if sys_descr else None
    if "lenovo" in lower or "ibm" in lower:
        return "Lenovo/IBM", sys_descr[:200] if sys_descr else None
    if "vmware" in lower:
        return "VMware", sys_descr[:200] if sys_descr else None
    if "microsoft" in lower or "windows" in lower:
        return "Microsoft", sys_descr[:200] if sys_descr else None
    return None, sys_descr[:200] if sys_descr else None


async def _snmp_discover_host(host_ip: str, community: str = "public") -> dict | None:
    """Discover a single host via SNMP. Returns asset data dict or None."""
    try:
        from pysnmp.hlapi.asyncio import SnmpEngine
        snmp_engine = SnmpEngine()
    except ImportError:
        logger.warning("pysnmp not installed, cannot run SNMP discovery")
        return None

    # Core OIDs
    OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"
    OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"
    OID_SYS_OBJECTID = "1.3.6.1.2.1.1.2.0"
    OID_SYS_UPTIME = "1.3.6.1.2.1.1.3.0"

    # Walk the SNMP tree
    sys_descr = await _snmp_get(snmp_engine, host_ip, community, OID_SYS_DESCR)
    if sys_descr is None:
        return None  # Host not responding to SNMP

    sys_name = await _snmp_get(snmp_engine, host_ip, community, OID_SYS_NAME)
    sys_obj_id = await _snmp_get(snmp_engine, host_ip, community, OID_SYS_OBJECTID)
    sys_uptime = await _snmp_get(snmp_engine, host_ip, community, OID_SYS_UPTIME)

    # Walk interface table for MAC addresses and interface details
    if_table = await _snmp_walk(snmp_engine, host_ip, community, "1.3.6.1.2.1.2.2.1")

    # Build network interfaces list
    interfaces = []
    if_indices = set()
    for oid, _val in if_table.items():
        parts = oid.split(".")
        if len(parts) >= 10:
            idx = parts[9]
            if_idx = int(idx) if idx.isdigit() else 0
            if_indices.add(if_idx)

    # Get interface details per index
    OID_IF_NAME = "1.3.6.1.2.1.2.2.1.2"
    OID_IF_MAC = "1.3.6.1.2.1.2.2.1.6"
    OID_IF_STATUS = "1.3.6.1.2.1.2.2.1.8"

    if_name_map = await _snmp_walk(snmp_engine, host_ip, community, OID_IF_NAME)
    if_mac_map = await _snmp_walk(snmp_engine, host_ip, community, OID_IF_MAC)
    if_status_map = await _snmp_walk(snmp_engine, host_ip, community, OID_IF_STATUS)

    first_mac = None
    for if_idx in sorted(if_indices):
        idx_str = str(if_idx)
        iface = {
            "index": if_idx,
            "name": if_name_map.get(f"{OID_IF_NAME}.{idx_str}", f"if{if_idx}"),
            "mac": None,
            "status": "unknown",
        }
        # Parse MAC
        raw_mac = if_mac_map.get(f"{OID_IF_MAC}.{idx_str}")
        if raw_mac:
            mac = _format_snmp_mac(raw_mac)
            if mac:
                iface["mac"] = mac
                if first_mac is None:
                    first_mac = mac
        # Parse status
        raw_status = if_status_map.get(f"{OID_IF_STATUS}.{idx_str}")
        if raw_status:
            iface["status"] = "up" if raw_status == "1" else "down"
        interfaces.append(iface)

    device_type = _detect_device_type(sys_descr, sys_obj_id or "")
    manufacturer, model = _parse_manufacturer_model(sys_descr)

    return {
        "ip_address": host_ip,
        "hostname": sys_name.strip() if sys_name else None,
        "mac_address": first_mac,
        "device_type": device_type,
        "discovery_source": "SNMP",
        "manufacturer": manufacturer,
        "model": model,
        "os_name": sys_descr[:255] if sys_descr else None,
        "status": "Online",
        "raw_scan_data": {
            "sys_descr": sys_descr,
            "sys_name": sys_name,
            "sys_object_id": sys_obj_id,
            "sys_uptime": sys_uptime,
            "interface_count": len(interfaces),
        },
        "network_interfaces": interfaces,
        "last_scanned_at": datetime.now(UTC).isoformat(),
    }


def _format_snmp_mac(raw: str) -> str | None:
    """Format SNMP MAC response to xx:xx:xx:xx:xx:xx."""
    try:
        if raw.startswith("0x"):
            hex_str = raw[2:]
            mac = ":".join(hex_str[i:i+2] for i in range(0, 12, 2))
            return mac.lower()
        if ":" in raw and len(raw) == 17:
            return raw.lower()
    except Exception:
        pass
    return None


async def _run_snmp_discovery_async(
    tenant_id: str,
    target_ips: list[str],
    community: str = "public",
    scan_id: str = "",
):
    """Run SNMP discovery: first ping-sweep to find live hosts, then SNMP only on live hosts."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.core.system_log import log_system
    from app.models.asset import Asset
    from app.models.discovery import DiscoveryScan

    try:
        tenant_uuid = UUID(tenant_id) if tenant_id else None
    except ValueError:
        tenant_uuid = None

    async with async_session_factory() as db:
        start_time = time.time()
        try:
            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=f"Starting SNMP discovery: ping sweep + SNMP on {len(target_ips)} targets",
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            # Phase 1: Ping sweep to find live hosts
            concurrency = min(80, len(target_ips))
            semaphore = asyncio.Semaphore(concurrency)
            ping_tasks = [_ping_host_async(ip, semaphore) for ip in target_ips]
            ping_results = await asyncio.gather(*ping_tasks, return_exceptions=True)

            live_ips = []
            live_map = {}
            for pr in ping_results:
                ping_result = _as_result(pr)
                if ping_result is None:
                    continue
                if ping_result["is_alive"]:
                    live_ips.append(ping_result["ip"])
                    live_map[ping_result["ip"]] = ping_result

            logger.info(f"SNMP discovery: ping sweep found {len(live_ips)}/{len(target_ips)} live hosts")

            # Update scan record with ping results
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.results = {
                            "total_targets": len(target_ips),
                            "live_hosts": len(live_ips),
                            "phase": "snmp_scan",
                            "discovered": 0,
                            "updated": 0,
                            "failed": 0,
                        }
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass

            # Phase 2: SNMP only on live hosts (and skip IPs already known to be offline)
            discovered = 0
            updated = 0
            snmp_failed = 0
            offline_skipped = len(target_ips) - len(live_ips)

            for ip in live_ips:
                try:
                    asset_data = await _snmp_discover_host(ip, community)
                    if asset_data is None:
                        snmp_failed += 1
                        continue

                    # UPSERT: check if asset exists by ip_address
                    result = await db.execute(
                        select(Asset).where(
                            Asset.ip_address == ip,
                            Asset.tenant_id == tenant_uuid,
                        )
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        existing.hostname = asset_data.get("hostname") or existing.hostname
                        existing.mac_address = asset_data.get("mac_address") or existing.mac_address
                        existing.device_type = asset_data.get("device_type") or existing.device_type
                        existing.discovery_source = "SNMP"
                        existing.manufacturer = asset_data.get("manufacturer") or existing.manufacturer
                        existing.model = asset_data.get("model") or existing.model
                        existing.os_name = asset_data.get("os_name") or existing.os_name
                        existing.status = asset_data.get("status", "Online")
                        existing.last_scanned_at = datetime.now(UTC)
                        existing.raw_scan_data = asset_data.get("raw_scan_data")
                        existing.network_interfaces = asset_data.get("network_interfaces")
                        db.add(existing)
                        updated += 1
                    else:
                        new_asset = Asset(
                            tenant_id=tenant_uuid,
                            ip_address=asset_data["ip_address"],
                            mac_address=asset_data.get("mac_address"),
                            hostname=asset_data.get("hostname"),
                            device_type=asset_data.get("device_type", "Unknown"),
                            discovery_source="SNMP",
                            manufacturer=asset_data.get("manufacturer"),
                            model=asset_data.get("model"),
                            os_name=asset_data.get("os_name"),
                            status=asset_data.get("status", "Online"),
                            last_scanned_at=datetime.now(UTC),
                            raw_scan_data=asset_data.get("raw_scan_data"),
                            network_interfaces=asset_data.get("network_interfaces"),
                        )
                        db.add(new_asset)
                        discovered += 1

                    await db.commit()

                except Exception as e:
                    logger.warning(f"SNMP discovery failed for {ip}: {e}")
                    snmp_failed += 1
                    with contextlib.suppress(Exception):
                        await db.rollback()

            elapsed_ms = int((time.time() - start_time) * 1000)
            summary = (
                f"SNMP discovery completed: {discovered} new assets, "
                f"{updated} updated, {snmp_failed} SNMP-failed, "
                f"{offline_skipped} offline (ping) out of {len(target_ips)} targets in {elapsed_ms}ms"
            )
            logger.info(summary)

            # Update scan record with final results
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "completed"
                        scan.completed_at = datetime.now(UTC)
                        scan.results = {
                            "total_targets": len(target_ips),
                            "live_hosts": len(live_ips),
                            "discovered": discovered,
                            "updated": updated,
                            "snmp_failed": snmp_failed,
                            "offline_skipped": offline_skipped,
                            "duration_ms": elapsed_ms,
                        }
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass

            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=summary,
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                duration_ms=elapsed_ms,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            return {"discovered": discovered, "updated": updated, "failed": snmp_failed, "offline": offline_skipped, "total": len(target_ips)}

        except Exception as e:
            logger.error(f"SNMP discovery task failed: {e}")
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "failed"
                        scan.error_message = str(e)[:1000]
                        scan.completed_at = datetime.now(UTC)
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass
            try:
                await log_system(
                    db=db,
                    level="error",
                    category="discovery",
                    message=f"SNMP discovery failed: {str(e)[:500]}",
                    details=str(e),
                    source="CeleryWorker",
                    entity_type="asset_discovery",
                    task_id=scan_id,
                    tenant_id=tenant_uuid,
                )
                await db.commit()
            except Exception:
                pass
            raise


async def _ping_host_async(host_ip: str, semaphore: asyncio.Semaphore) -> dict:
    """Async ICMP ping using subprocess, returns dict with ip and is_alive."""
    async with semaphore:
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", host_ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=3)
            output = stdout.decode("utf-8", errors="replace")
            response_time_ms = None
            match = re.search(r"time[=]<(\d+\.?\d*)\s*ms|time=(\d+\.?\d*)\s*ms", output)
            if match:
                response_time_ms = float(match.group(1) or match.group(2))
            return {"ip": host_ip, "is_alive": proc.returncode == 0, "response_time_ms": response_time_ms}
        except (TimeoutError, Exception):
            return {"ip": host_ip, "is_alive": False, "response_time_ms": None}


# ---------------------------------------------------------------------------
# PING / FULL Asset Discovery
# ---------------------------------------------------------------------------

async def _run_ping_asset_discovery_async(
    tenant_id: str,
    target_ips: list[str],
    scan_id: str = "",
    with_snmp: bool = False,
    community: str = "public",
):
    """Run PING or FULL asset discovery: ping sweep first, then optionally SNMP
    on live hosts (FULL). Upserts/updates Asset records for live hosts."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.core.system_log import log_system
    from app.models.asset import Asset
    from app.models.discovery import DiscoveryScan

    try:
        tenant_uuid = UUID(tenant_id) if tenant_id else None
    except ValueError:
        tenant_uuid = None

    async with async_session_factory() as db:
        start_time = time.time()
        try:
            label = "FULL" if with_snmp else "PING"
            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=f"Starting {label} asset discovery on {len(target_ips)} targets",
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            # Phase 1: Ping sweep
            concurrency = min(80, len(target_ips))
            semaphore = asyncio.Semaphore(concurrency)
            ping_tasks = [_ping_host_async(ip, semaphore) for ip in target_ips]
            ping_results = await asyncio.gather(*ping_tasks, return_exceptions=True)

            live_ips = []
            live_map = {}
            for pr in ping_results:
                ping_result = _as_result(pr)
                if ping_result is None:
                    continue
                if ping_result["is_alive"]:
                    live_ips.append(ping_result["ip"])
                    live_map[ping_result["ip"]] = ping_result

            logger.info(f"{label} discovery: ping sweep found {len(live_ips)}/{len(target_ips)} live hosts")

            # Phase 2: optionally SNMP on live hosts (FULL)
            discovered = 0
            updated = 0
            snmp_failed = 0
            offline_skipped = len(target_ips) - len(live_ips)

            for ip in live_ips:
                asset_data = None
                if with_snmp:
                    try:
                        asset_data = await _snmp_discover_host(ip, community)
                    except Exception:
                        asset_data = None
                    if asset_data is None:
                        snmp_failed += 1

                # Even if SNMP failed, a live host is still an asset (ping-known)
                result = await db.execute(
                    select(Asset).where(
                        Asset.ip_address == ip,
                        Asset.tenant_id == tenant_uuid,
                    )
                )
                existing = result.scalar_one_or_none()

                if asset_data is None:
                    # Ping-only record
                    if existing:
                        existing.status = "Online"
                        existing.last_scanned_at = datetime.now(UTC)
                        db.add(existing)
                        updated += 1
                    else:
                        db.add(Asset(
                            tenant_id=tenant_uuid,
                            ip_address=ip,
                            status="Online",
                            device_type="Unknown",
                            discovery_source="PING",
                            last_scanned_at=datetime.now(UTC),
                        ))
                        discovered += 1
                    await db.commit()
                    continue

                if existing:
                    existing.hostname = asset_data.get("hostname") or existing.hostname
                    existing.mac_address = asset_data.get("mac_address") or existing.mac_address
                    existing.device_type = asset_data.get("device_type") or existing.device_type
                    existing.discovery_source = "SNMP"
                    existing.manufacturer = asset_data.get("manufacturer") or existing.manufacturer
                    existing.model = asset_data.get("model") or existing.model
                    existing.os_name = asset_data.get("os_name") or existing.os_name
                    existing.status = asset_data.get("status", "Online")
                    existing.last_scanned_at = datetime.now(UTC)
                    existing.raw_scan_data = asset_data.get("raw_scan_data")
                    existing.network_interfaces = asset_data.get("network_interfaces")
                    db.add(existing)
                    updated += 1
                else:
                    db.add(Asset(
                        tenant_id=tenant_uuid,
                        ip_address=asset_data["ip_address"],
                        mac_address=asset_data.get("mac_address"),
                        hostname=asset_data.get("hostname"),
                        device_type=asset_data.get("device_type", "Unknown"),
                        discovery_source="SNMP",
                        manufacturer=asset_data.get("manufacturer"),
                        model=asset_data.get("model"),
                        os_name=asset_data.get("os_name"),
                        status=asset_data.get("status", "Online"),
                        last_scanned_at=datetime.now(UTC),
                        raw_scan_data=asset_data.get("raw_scan_data"),
                        network_interfaces=asset_data.get("network_interfaces"),
                    ))
                    discovered += 1

                await db.commit()

            elapsed_ms = int((time.time() - start_time) * 1000)
            summary = (
                f"{label} discovery completed: {discovered} new assets, "
                f"{updated} updated, {snmp_failed} SNMP-failed, "
                f"{offline_skipped} offline (ping) out of {len(target_ips)} targets in {elapsed_ms}ms"
            )
            logger.info(summary)

            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "completed"
                        scan.completed_at = datetime.now(UTC)
                        scan.results = {
                            "total_targets": len(target_ips),
                            "live_hosts": len(live_ips),
                            "discovered": discovered,
                            "updated": updated,
                            "snmp_failed": snmp_failed,
                            "offline_skipped": offline_skipped,
                            "duration_ms": elapsed_ms,
                        }
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass

            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=summary,
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                duration_ms=elapsed_ms,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            return {"discovered": discovered, "updated": updated, "failed": snmp_failed, "offline": offline_skipped, "total": len(target_ips)}

        except Exception as e:
            logger.error(f"{label} discovery task failed: {e}")
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "failed"
                        scan.error_message = str(e)[:1000]
                        scan.completed_at = datetime.now(UTC)
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass
            try:
                await log_system(
                    db=db,
                    level="error",
                    category="discovery",
                    message=f"{label} discovery failed: {str(e)[:500]}",
                    details=str(e),
                    source="CeleryWorker",
                    entity_type="asset_discovery",
                    task_id=scan_id,
                    tenant_id=tenant_uuid,
                )
                await db.commit()
            except Exception:
                pass
            raise


# ---------------------------------------------------------------------------
# WinRM Discovery (via pypsrp)
# ---------------------------------------------------------------------------
POWERSHELL_HARDWARE_SCRIPT = r"""
$cs = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$adapters = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true }

$interfaces = @()
foreach ($a in $adapters) {
    $interfaces += @{
        name = $a.Description
        mac = $a.MACAddress
        ip = ($a.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
        subnet = ($a.IPSubnet | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
    }
}

$ram_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)

$result = @{
    hostname = $cs.Name
    domain = $cs.Domain
    manufacturer = $cs.Manufacturer
    model = $cs.Model
    serial_number = $bios.SerialNumber
    os_name = $os.Caption
    os_version = $os.Version
    cpu_cores = $cpu.NumberOfCores
    cpu_name = $cpu.Name
    ram_gb = $ram_gb
    interfaces = $interfaces
}

$result | ConvertTo-Json -Depth 5
""".strip()


async def _winrm_discover_host(
    host_ip: str,
    username: str,
    password: str,
    port: int = 5985,
    use_ssl: bool = False,
) -> dict | None:
    """Discover a Windows host via WinRM (pypsrp). Returns asset data dict or None."""
    try:
        from pypsrp.powershell import PowerShell, RunspacePool
        from pypsrp.wsman import WSMan
    except ImportError:
        logger.warning("pypsrp not installed, cannot run WinRM discovery")
        return None

    try:
        wsman = WSMan(
            server=host_ip,
            port=port,
            username=username,
            password=password,
            ssl=use_ssl,
            cert_validation=False,
            operation_timeout=30,
            connect_timeout=15,
        )

        with RunspacePool(wsman, min_runspaces=1, max_runspaces=1) as pool:
            ps = PowerShell(pool)
            ps.add_script(POWERSHELL_HARDWARE_SCRIPT)
            output = ps.invoke()

            if not output:
                return None

            raw_json = output[0] if output else None
            if not raw_json:
                return None

            hw_data = json.loads(str(raw_json))

            interfaces = []
            for iface in hw_data.get("interfaces", []):
                interfaces.append({
                    "name": iface.get("name", ""),
                    "mac": iface.get("mac"),
                    "ip": iface.get("ip"),
                    "subnet": iface.get("subnet"),
                })

            first_mac = None
            for iface in interfaces:
                if iface.get("mac"):
                    first_mac = iface["mac"]
                    break

            return {
                "ip_address": host_ip,
                "hostname": hw_data.get("hostname"),
                "domain": hw_data.get("domain"),
                "mac_address": first_mac,
                "device_type": "Server" if "server" in (hw_data.get("os_name") or "").lower() else "Workstation",
                "discovery_source": "WINRM",
                "manufacturer": hw_data.get("manufacturer"),
                "model": hw_data.get("model"),
                "serial_number": hw_data.get("serial_number"),
                "os_name": hw_data.get("os_name"),
                "os_version": hw_data.get("os_version"),
                "cpu_cores": hw_data.get("cpu_cores"),
                "ram_gb": hw_data.get("ram_gb"),
                "status": "Online",
                "raw_scan_data": {
                    "cpu_name": hw_data.get("cpu_name"),
                    "sys_descr": f"{hw_data.get('manufacturer', '')} {hw_data.get('model', '')} | {hw_data.get('os_name', '')} {hw_data.get('os_version', '')}",
                },
                "network_interfaces": interfaces,
                "last_scanned_at": datetime.now(UTC).isoformat(),
            }

    except ImportError:
        logger.warning("pypsrp not installed")
        return None
    except Exception as e:
        logger.debug(f"WinRM discovery to {host_ip} failed: {e}")
        return None


async def _run_winrm_discovery_async(
    tenant_id: str,
    target_ips: list[str],
    username: str,
    password: str,
    port: int = 5985,
    use_ssl: bool = False,
    scan_id: str = "",
):
    """Run WinRM discovery: first ping-sweep, then WinRM only on live hosts."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.core.system_log import log_system
    from app.models.asset import Asset
    from app.models.discovery import DiscoveryScan

    try:
        tenant_uuid = UUID(tenant_id) if tenant_id else None
    except ValueError:
        tenant_uuid = None

    async with async_session_factory() as db:
        start_time = time.time()
        try:
            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=f"Starting WinRM discovery: ping sweep + WinRM on {len(target_ips)} targets",
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            # Phase 1: Ping sweep
            concurrency = min(80, len(target_ips))
            semaphore = asyncio.Semaphore(concurrency)
            ping_tasks = [_ping_host_async(ip, semaphore) for ip in target_ips]
            ping_results = await asyncio.gather(*ping_tasks, return_exceptions=True)

            live_ips = []
            for pr in ping_results:
                ping_result = _as_result(pr)
                if ping_result is None:
                    continue
                if ping_result["is_alive"]:
                    live_ips.append(ping_result["ip"])

            logger.info(f"WinRM discovery: ping sweep found {len(live_ips)}/{len(target_ips)} live hosts")

            # Update scan record with ping results
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.results = {
                            "total_targets": len(target_ips),
                            "live_hosts": len(live_ips),
                            "phase": "winrm_scan",
                            "discovered": 0,
                            "updated": 0,
                            "failed": 0,
                        }
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass

            # Phase 2: WinRM on live hosts
            discovered = 0
            updated = 0
            failed = 0
            offline_skipped = len(target_ips) - len(live_ips)

            for ip in live_ips:
                try:
                    asset_data = await _winrm_discover_host(
                        ip, username, password, port, use_ssl
                    )
                    if asset_data is None:
                        failed += 1
                        continue

                    result = await db.execute(
                        select(Asset).where(
                            Asset.ip_address == ip,
                            Asset.tenant_id == tenant_uuid,
                        )
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        existing.hostname = asset_data.get("hostname") or existing.hostname
                        existing.domain = asset_data.get("domain") or existing.domain
                        existing.mac_address = asset_data.get("mac_address") or existing.mac_address
                        existing.device_type = asset_data.get("device_type") or existing.device_type
                        existing.discovery_source = "WINRM"
                        existing.manufacturer = asset_data.get("manufacturer") or existing.manufacturer
                        existing.model = asset_data.get("model") or existing.model
                        existing.serial_number = asset_data.get("serial_number") or existing.serial_number
                        existing.os_name = asset_data.get("os_name") or existing.os_name
                        existing.os_version = asset_data.get("os_version") or existing.os_version
                        existing.cpu_cores = asset_data.get("cpu_cores") or existing.cpu_cores
                        existing.ram_gb = asset_data.get("ram_gb") or existing.ram_gb
                        existing.status = asset_data.get("status", "Online")
                        existing.last_scanned_at = datetime.now(UTC)
                        existing.raw_scan_data = asset_data.get("raw_scan_data")
                        existing.network_interfaces = asset_data.get("network_interfaces")
                        db.add(existing)
                        updated += 1
                    else:
                        new_asset = Asset(
                            tenant_id=tenant_uuid,
                            ip_address=asset_data["ip_address"],
                            mac_address=asset_data.get("mac_address"),
                            hostname=asset_data.get("hostname"),
                            domain=asset_data.get("domain"),
                            device_type=asset_data.get("device_type", "Unknown"),
                            discovery_source="WINRM",
                            manufacturer=asset_data.get("manufacturer"),
                            model=asset_data.get("model"),
                            serial_number=asset_data.get("serial_number"),
                            os_name=asset_data.get("os_name"),
                            os_version=asset_data.get("os_version"),
                            cpu_cores=asset_data.get("cpu_cores"),
                            ram_gb=asset_data.get("ram_gb"),
                            status=asset_data.get("status", "Online"),
                            last_scanned_at=datetime.now(UTC),
                            raw_scan_data=asset_data.get("raw_scan_data"),
                            network_interfaces=asset_data.get("network_interfaces"),
                        )
                        db.add(new_asset)
                        discovered += 1

                    await db.commit()

                except Exception as e:
                    logger.warning(f"WinRM discovery failed for {ip}: {e}")
                    failed += 1
                    with contextlib.suppress(Exception):
                        await db.rollback()

            elapsed_ms = int((time.time() - start_time) * 1000)
            summary = (
                f"WinRM discovery completed: {discovered} new assets, "
                f"{updated} updated, {failed} failed, "
                f"{offline_skipped} offline (ping) out of {len(target_ips)} targets in {elapsed_ms}ms"
            )
            logger.info(summary)

            # Update scan record
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "completed"
                        scan.completed_at = datetime.now(UTC)
                        scan.results = {
                            "total_targets": len(target_ips),
                            "live_hosts": len(live_ips),
                            "discovered": discovered,
                            "updated": updated,
                            "failed": failed,
                            "offline_skipped": offline_skipped,
                            "duration_ms": elapsed_ms,
                        }
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass

            await log_system(
                db=db,
                level="info",
                category="discovery",
                message=summary,
                source="CeleryWorker",
                entity_type="asset_discovery",
                task_id=scan_id,
                duration_ms=elapsed_ms,
                tenant_id=tenant_uuid,
            )
            await db.commit()

            return {"discovered": discovered, "updated": updated, "failed": failed, "offline": offline_skipped, "total": len(target_ips)}

        except Exception as e:
            logger.error(f"WinRM discovery task failed: {e}")
            if scan_id:
                try:
                    scan_result = await db.execute(
                        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
                    )
                    scan = scan_result.scalar_one_or_none()
                    if scan:
                        scan.status = "failed"
                        scan.error_message = str(e)[:1000]
                        scan.completed_at = datetime.now(UTC)
                        db.add(scan)
                        await db.commit()
                except Exception:
                    pass
            try:
                await log_system(
                    db=db,
                    level="error",
                    category="discovery",
                    message=f"WinRM discovery failed: {str(e)[:500]}",
                    details=str(e),
                    source="CeleryWorker",
                    entity_type="asset_discovery",
                    task_id=scan_id,
                    tenant_id=tenant_uuid,
                )
                await db.commit()
            except Exception:
                pass
            raise
