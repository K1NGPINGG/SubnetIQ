<img width="100" height="100" alt="SubnetIQ_Logo" src="https://github.com/K1NGPINGG/SubnetIQ/blob/main/Logo/SubnetIQ_logo.png" /> SubnetIQ

A modern IP Address Management (IPAM) platform built with FastAPI, React, PostgreSQL, and Celery.

## Features

- **IP Address Management** — subnet hierarchy, IP allocation/deallocation, utilization tracking
- **Virtual IP (VIP) Inventory** — mark IPs as VIPs (Keepalived, CARP/VRRP, load balancer, Kubernetes, floating cloud), link them to backing node IPs, and filter VIPs in the UI
- **Address Hierarchy** — VRFs, RIRs, Aggregates, IP Ranges, and ASNs for structured address space
- **Site & VLAN Management** — organize assets by location and network segment
- **Asset Discovery** — SNMP and WinRM scanning for automatic inventory
- **Dashboard** — real-time overview of network health, utilization, and alerts
- **Map View** — interactive site map with location pins
- **Tags & Custom Fields** — enrich subnets, IPs, and sites with metadata
- **Validation Rules** — enforce IP allocation policy at creation time
- **Approval Workflow** — request/approve/reject sensitive IP lifecycle changes
- **Webhooks** — notify external systems on IP create/update/delete
- **Global Search** — one box to find subnets, IPs, sites, and assets
- **System Logs** — backend application logs with level/category/source filters
- **Multi-Tenant** — isolated environments with role-based access control
- **MFA Support** — TOTP-based multi-factor authentication
- **Audit Logging** — full audit trail of all changes
- **Dark Mode** — built-in light/dark theme support

## Documentation

- **[Onboarding Guide](docs/ONBOARDING.md)** — step-by-step walkthrough of every feature, from first login to day-to-day IPAM operations.
- **[Changelog](CHANGELOG.md)** — a history of all changes by release.
- **In-app Help** — the "Help & Documentation" page inside SubnetIQ covers every page and the full REST API reference.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, Celery + Redis, uvicorn |
| Network Discovery | pysnmp-lextudio (SNMP v1/v2c/v3) |
| WinRM Discovery | pypsrp (PowerShell Remoting / CIM-WMI) |
| Security | JWT (python-jose), bcrypt/passlib, pyotp (TOTP MFA), Fernet encryption, slowapi (rate limiting) |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, TanStack Query, TanStack Table, Zustand, React Hook Form + Zod, Recharts, Leaflet, axios, lucide-react |
| Database | PostgreSQL 16, Redis 7 |
| Deployment | Docker Compose (with `with-proxy` profile), Nginx (SPA + optional bundled HTTPS reverse proxy) |
| Quality | pytest, pytest-asyncio, ruff, mypy, GitHub Actions CI |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/SubnetIQ.git
cd SubnetIQ

# Create your environment file
cp .env.example .env
# Edit .env with your own secrets (see Security section below)

# Option 1 - Standalone (default): app served directly on port 3000
docker compose up -d --build
open http://localhost:3000

# Option 2 - Standalone + bundled Nginx with HTTPS (self-signed by default)
docker compose --profile with-proxy up -d --build
open https://localhost
```

### Default Login

After first boot, the superadmin account is created automatically using the credentials in your `.env`:

- **Email:** `SUPERADMIN_EMAIL` (default: `admin@ipam.local`)
- **Password:** `SUPERADMIN_PASSWORD`

**Change the default password immediately after first login.**

## Deployment Options

SubnetIQ is **standalone-first**: `docker compose up -d` starts only the application
(Postgres, Redis, backend, SPA frontend, Celery worker) and serves it directly on the host.

### Option 1 — Standalone or behind an existing reverse proxy

The application is exposed on `APP_PORT` (default `3000`) as `http://localhost:3000` and
handles both the SPA and the `/api` traffic. Point an existing reverse proxy (Nginx
Proxy Manager, Traefik, Caddy, HAProxy, ...) at `http://localhost:3000` and terminate TLS
there. No additional services are started.

```bash
docker compose up -d --build
```

### Option 2 — Standalone with the bundled Nginx (HTTPS)

A bundled Nginx reverse proxy is available under the `with-proxy` Compose profile. It binds
ports `80` and `443`, terminates TLS, and proxies to the app container:

```bash
docker compose --profile with-proxy up -d --build
```

Because it is profile-gated, it is **never started** by a plain `docker compose up -d`.

## HTTPS / SSL Modes

SSL handling of the bundled Nginx is controlled by `SSL_MODE` in `.env`. Certificates live
under `./certs/` and Let's Encrypt state under `./certbot/` (both git-ignored).

| Mode | `SSL_MODE` | Behaviour |
|------|------------|-----------|
| A — Self-signed | `selfsigned` (default) | An RSA 2048 self-signed certificate is generated automatically on first boot into `./certs/selfsigned/` if none exists, so `https://<host>` works immediately. |
| B — Let's Encrypt | `letsencrypt` | The `certbot` service obtains a real certificate via the HTTP-01 challenge and renews it automatically. Requires `APP_DOMAIN` and `LETSENCRYPT_EMAIL`. |
| C — Custom import | `custom` | Use your own certificate. Place `fullchain.pem` and `privkey.pem` in `./certs/custom/` before starting. |

### Mode A — Self-signed (default)

Nothing to configure. If `./certs/selfsigned/` does not contain a certificate yet, one is
generated at boot.

### Mode B — Let's Encrypt / Certbot

1. Set a public `APP_DOMAIN` (e.g. `ipam.example.com`) that resolves to this host.
2. Set `SSL_MODE=letsencrypt` and `LETSENCRYPT_EMAIL=you@example.com` in `.env`.
3. Make sure port `80` is reachable from the internet (the ACME HTTP-01 challenge is served
   from `./certbot/www/`).
4. Start with the proxy profile:

```bash
docker compose --profile with-proxy up -d --build
```

The `certbot` service issues the certificate on first start and renews it automatically;
Nginx reloads whenever the certificate changes.

### Mode C — Custom SSL certificate

1. Create `./certs/custom/` and place your files there:
   - `./certs/custom/fullchain.pem`
   - `./certs/custom/privkey.pem`
2. Set `SSL_MODE=custom` in `.env`.
3. Start with the proxy profile:

```bash
docker compose --profile with-proxy up -d --build
```

> **Note:** when using TLS on a public domain, also add your origin (e.g.
> `https://ipam.example.com`) to `ALLOWED_ORIGINS` in `.env` and restart the backend.

## Project Structure

```
SubnetIQ/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security, database, encryption
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── tasks/        # Celery tasks (discovery, SNMP, WinRM)
│   ├── alembic/          # Database migrations
│   └── Dockerfile
├── frontend/             # React application (Docker build context)
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── hooks/        # React Query hooks
│       ├── pages/        # Route pages
│       └── shared/       # Stores, API client, utilities
├── docker/nginx/         # Optional bundled reverse proxy (with-proxy profile)
│   ├── Dockerfile        # Nginx + OpenSSL
│   ├── nginx.conf.template
│   ├── ssl-setup.sh      # SSL modes: selfsigned / letsencrypt / custom
│   ├── entrypoint.sh     # Renders config + starts Nginx
│   └── certbot-entrypoint.sh
├── certs/                # Runtime SSL certificates (git-ignored)
├── certbot/              # Let's Encrypt state (git-ignored)
├── docker-compose.yml    # Service orchestration
├── .env.example          # Environment template
└── README.md
```

## Security

This application stores encrypted credentials (SNMP community strings, WinRM passwords) using Fernet symmetric encryption. All secrets in `.env` should be unique, randomly generated values.

**Never commit your `.env` file to version control.**

## Screenshots

## License

[MIT](LICENSE) — Free to use, modify, and distribute in commercial and non-commercial environments.
