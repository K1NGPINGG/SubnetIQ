# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.4] - 2026

### Fixed

- **Update progress bar no longer jumps to 100%** — the backend now resets the update state to
  "running / 0%" the moment an update is triggered (instead of leaving the previous update's
  stale "success / 100%"), and the UI ignores that stale state and shows an indeterminate bar
  until the updater actually starts. The bar tracks each step and the page auto-reloads when
  the update completes.
- **Fixed garbled characters in several pages** — restored the proper UTF-8 text (em-dashes,
  box-drawing dividers, bullet separators) and removed stray byte-order marks that had been
  introduced into the source files (Sites, Subnets, VLANs, Tenants, IPs, Virtual IPs, IPAM
  Records, Admin, SNMP/WinRM profiles).

## [1.2.3] - 2026

### Fixed

- **Update progress bar now reliably appears** — while an update runs the Admin Updates tab polls
  the status endpoint directly every 1.5s (instead of relying only on the cached query), so the
  bar shows immediately and tracks progress even while the app containers are being recreated.
- **Page auto-refreshes after an update** — once the update completes the app reloads itself to
  load the new build/version.
- **UK date/time format** — the update log and update timestamps now display in UK standard
  order, e.g. `21:06:40 - 04/08/2026` (HH:MM:SS - DD/MM/YYYY).

## [1.2.2] - 2026

### Changed

- **Dashboard Subnet Utilization panel** — now paginated to keep the dashboard tidy:
  - "Show results per page" selector (5 / 10 / 20 / 50 / All), defaulting to **5**.
  - Page navigation (previous/next + page numbers) so you can browse all subnets.
  - The Subnets by Utilization chart's "All" option now renders every subnet (previously
    capped at the top 5/10).

## [1.2.1] - 2026

### Fixed

- **Dashboard "Subnets by Utilization" "All" filter** — previously capped at the top 5 (and at
  most 10) subnets; selecting "All" now returns every subnet.
- **Results-per-page is remembered** — the page-size selection (10/50/100/All) is persisted
  and applied on every list across the app.
- **Update progress bar** — now appears reliably when an update starts (optimistic display +
  fast polling) instead of being missed on quick updates, and the page **auto-reloads**
  once the update completes so the new build/version loads.
- **Consistent Edit button** — all pages with editing now use the same labeled Edit button
  (CRUD pages, IPs, IPAM Records, VIPs, users, SNMP/WinRM profiles, sites, subnets, VLANs, tenants).
- **"What's New" grouped by release** — Help page now lists features under their version
  (v1.2.0 / v1.0.3 / v1.0.2 / v1.0.0).

## [1.2.0] - 2026

### Added

- **Virtual IP (VIP) inventory tracking** — IP addresses can be marked as VIPs
  (`is_vip`) with a `vip_type` (keepalived, carp_vrrp, load_balancer, kubernetes,
  floating_cloud) and linked 1:N to their backing node IPs via a new
  `vip_node_bindings` association (roles: primary/backup/active/standby).
- **VIP UI** — a VIP badge and type/bound-nodes columns in the IP table, a
  `[ All IPs | Static IPs | VIPs Only ]` filter, and a VIP editor in the IP modal
  (toggle + type dropdown + dynamic node assignment).
- **Update progress bar** — the in-app updater reports progress (0-100) and a
  step label so stack updates can be tracked live.
- **Manual update check** — a "Check for updates" button forces a fresh GitHub
  release check; automatic checks are now cached for 6 hours (twice per 12h)
  instead of hitting the GitHub API on every status poll.
- **Resizable dashboard map** — drag the map handle to resize (200-600px), with
  scrollable site tooltips that no longer disappear on hover or zoom the map.

### Fixed

- Dashboard map markers no longer disappear after resizing (react-leaflet v5
  captures the `style` prop once — height is now applied via the Leaflet
  container directly).
- `APP_VERSION` no longer goes stale in `.env` (the code default is authoritative),
  so the Updates page reports the correct current version.

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

[1.2.4]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/K1NGPINGG/SubnetIQ/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/K1NGPINGG/SubnetIQ/releases/tag/v1.0.0
