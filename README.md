# SubnetIQ

A modern IP Address Management (IPAM) platform built with FastAPI, React, PostgreSQL, and Celery.

## Features

- **IP Address Management** — subnet hierarchy, IP allocation/deallocation, utilization tracking
- **Site & VLAN Management** — organize assets by location and network segment
- **Asset Discovery** — SNMP and WinRM scanning for automatic inventory
- **Dashboard** — real-time overview of network health, utilization, and alerts
- **Map View** — interactive site map with location pins
- **Multi-Tenant** — isolated environments with role-based access control
- **MFA Support** — TOTP-based multi-factor authentication
- **Audit Logging** — full audit trail of all changes
- **Dark Mode** — built-in light/dark theme support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Celery |
| Frontend | React 19, TypeScript, Vite 6, TanStack Table, Tailwind CSS v4 |
| Database | PostgreSQL 16, Redis 7 |
| Auth | JWT, bcrypt, TOTP MFA |
| Deployment | Docker Compose |

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
│   └── Dockerfile
├── frontend-src/         # React application source
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # React Query hooks
│   │   ├── pages/        # Route pages
│   │   └── shared/       # Stores, API client, utilities
│   └── package.json
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
