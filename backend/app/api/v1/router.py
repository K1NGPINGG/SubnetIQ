"""Main API v1 router aggregating all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, health, tenants, subnets, ips, vlans, sites, discovery, reports, admin, snmp_credentials, winrm_credentials, audit, system_logs, assets

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(sites.router, prefix="/sites", tags=["Sites"])
api_router.include_router(vlans.router, prefix="/vlans", tags=["VLANs"])
api_router.include_router(subnets.router, prefix="/subnets", tags=["Subnets"])
api_router.include_router(ips.router, prefix="/ips", tags=["IP Addresses"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["Discovery"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(snmp_credentials.router, prefix="/snmp-credentials", tags=["SNMP Credentials"])
api_router.include_router(winrm_credentials.router, prefix="/winrm-credentials", tags=["WinRM Credentials"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(system_logs.router, prefix="/logs", tags=["System Logs"])
