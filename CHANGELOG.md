# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026

### Added

- **Standalone-first deployment** — `docker compose up -d` boots only the core stack and
  serves the app directly on `APP_PORT` (default `3000`), ready for use on its own or behind
  an existing reverse proxy (NPM, Traefik, Caddy).
- **Optional bundled Nginx reverse proxy** — a new `nginx` service under the `with-proxy`
  Compose profile (`docker compose --profile with-proxy up -d`) terminates HTTPS on `443`,
  redirects HTTP to HTTPS, and proxies to the app.
- **Flexible SSL handling** — `SSL_MODE` supports self-signed (auto-generated on boot),
  Let's Encrypt (Certbot HTTP-01 with automatic renewal and live config reload), and custom
  certificate import from `./certs/custom/`.
- **Certbot service** — obtains and renews Let's Encrypt certificates automatically.
- Tracked `.env.example` documenting the new deployment/SSL variables, a step-by-step
  onboarding guide (`docs/ONBOARDING.md`), and README deployment documentation.

### Fixed

- **Fresh deployments** — the Alembic version table is now wide enough for long revision ids,
  and a new `012_sync_schema` migration brings the migration chain in line with the current
  models (adds `snmp_credentials`, `system_logs`, `users.mfa_enforced`, and more).
- **WinRM asset discovery** — corrected the pypsrp imports (`pypsrp.powershell` instead of
  `pypsrp.shell`) and the `RunspacePool` arguments, which broke discovery at runtime.
- **CI** — resolved all mypy errors, kept ruff clean, and bumped the deprecated GitHub
  Actions (`checkout`/`setup-python`) to versions that run on Node 24.

### Changed

- About and Help pages updated to cover the IPAM Records page and the latest build.

## [1.0.3] - 2026

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

[1.1.0]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/K1NGPINGG/SubnetIQ/releases/tag/v1.0.0
