# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **IPAM Records page** — a cross-subnet view of every IP in the system with search,
  status filtering, color-coded status tags, and columns for subnet CIDR, VRF, hostname,
  MAC, device type, assigned-to, tags, and custom fields.
- **Per-record editing** on the IPAM Records page (status, hostname, device type, MAC,
  assigned-to, subnet/VRF, description, tags, and type-aware custom-field editors; the IP
  itself is read-only).
- **Bulk editing** on the IPAM Records page — apply status/device type/assigned-to to many
  records at once, plus tag modes: **add**, **replace**, and **remove**.
- **CSV and PDF export** of the current IPAM Records view.
- Backend `GET /api/v1/ips/records` endpoint (subnet + VRF enrichment, no pagination).

### Fixed

- **Discovery scan status now updates live** — the frontend polls scan status every few
  seconds while a scan is pending/running/scheduled and stops when it is terminal, so scan
  progress no longer appears stale until a manual refresh.

## [1.0.2] - 2026

### Fixed

- Updater: restore executable bit on `updater.sh` after git checkout.

## [1.0.1] - 2026

### Changed

- Added `.gitattributes` to enforce LF line endings and normalize `updater.sh`.

### Fixed

- Updater: whitelist the stack directory for `git safe.directory` to handle root vs `ipam`
  file ownership, and ensure log/state files are readable by the backend.

## [1.0.0] - 2026

### Added

- **IP Address Management** — subnet hierarchy, IP allocation/deallocation, utilization tracking.
- **Address Hierarchy** — VRFs, RIRs, Aggregates, IP Ranges, and ASNs for structured address space.
- **Site & VLAN Management** — organize assets by physical location and network segment.
- **Asset Discovery** — SNMP and WinRM scanning for automatic hardware inventory (two-phase
  ping sweep + protocol query).
- **Network Discovery** — Ping (ICMP), ARP, SNMP, Ping+SNMP, and Full scan types with
  recursive scheduling, run-now, and cancel.
- **Dashboard** — real-time overview of network health, utilization, charts, and alerts.
- **Map View** — interactive site map with location pins.
- **Tags, Custom Fields & Validation Rules** — enrich and validate subnets, IPs, and sites.
- **Approval Workflow** — request/approve/reject sensitive IP lifecycle changes.
- **Webhooks** — notify external systems on IP create/update/delete (sync/async, signed payloads).
- **Global Search** — one box to find subnets, IPs, sites, and assets.
- **System Logs** — backend application logs with level/category/source filters.
- **Audit Logging** — full audit trail of all changes.
- **Multi-Tenant & RBAC** — isolated environments with role-based access control.
- **MFA Support** — TOTP-based multi-factor authentication.
- **Dark Mode** — built-in light/dark theme support.
- **Admin area** — user management, SNMP credentials, WinRM profiles.
- **Admin update feature** — check GitHub releases and automatically update the running stack.
- **REST API** — full REST API with JWT authentication and MFA.

[Unreleased]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/K1NGPINGG/SubnetIQ/releases/tag/v1.0.0
