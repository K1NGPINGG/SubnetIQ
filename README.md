# SubnetIQ

A modern IP Address Management (IPAM) platform built with FastAPI, React, PostgreSQL, and Celery.

## Features

- **IP Address Management** — subnet hierarchy, IP allocation/deallocation, utilization tracking
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
| Deployment | Docker Compose, Nginx (SPA reverse proxy) |
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

# Start all services
docker compose up -d --build

# Access the app
open http://localhost:3000
```

### Default Login

After first boot, the superadmin account is created automatically using the credentials in your `.env`:

- **Email:** `SUPERADMIN_EMAIL` (default: `admin@ipam.local`)
- **Password:** `SUPERADMIN_PASSWORD`

**Change the default password immediately after first login.**

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
├── docker-compose.yml    # Service orchestration
├── .env.example          # Environment template
└── README.md
```

## Security

This application stores encrypted credentials (SNMP community strings, WinRM passwords) using Fernet symmetric encryption. All secrets in `.env` should be unique, randomly generated values.

**Never commit your `.env` file to version control.**

## Screenshots

<img width="2545" height="1268" alt="image" src="https://github.com/user-attachments/assets/ac6bbbe1-2321-43fe-8c8a-4011f2935f47" />
<img width="2543" height="1267" alt="image" src="https://github.com/user-attachments/assets/97d54c43-7b4e-4e06-a1bd-82afbe4bdb22" />
<img width="966" height="1189" alt="image" src="https://github.com/user-attachments/assets/2f97c84c-022f-4d4e-a541-030fe415e055" />

## License

[MIT](LICENSE) — Free to use, modify, and distribute in commercial and non-commercial environments.
