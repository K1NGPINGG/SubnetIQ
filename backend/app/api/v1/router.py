"""Main API v1 router aggregating all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    aggregates,
    approvals,
    asns,
    assets,
    audit,
    auth,
    custom_fields,
    custom_validation_rules,
    discovery,
    health,
    ip_ranges,
    ips,
    reports,
    rirs,
    search,
    sites,
    snmp_credentials,
    subnets,
    system_logs,
    tags,
    tenants,
    update,
    vlans,
    vrfs,
    webhooks,
    winrm_credentials,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(sites.router, prefix="/sites", tags=["Sites"])
api_router.include_router(vlans.router, prefix="/vlans", tags=["VLANs"])
api_router.include_router(vrfs.router, prefix="/vrfs", tags=["VRFs"])
api_router.include_router(rirs.router, prefix="/rirs", tags=["RIRs"])
api_router.include_router(aggregates.router, prefix="/aggregates", tags=["Aggregates"])
api_router.include_router(ip_ranges.router, prefix="/ip-ranges", tags=["IP Ranges"])
api_router.include_router(asns.router, prefix="/asns", tags=["ASNs"])
api_router.include_router(subnets.router, prefix="/subnets", tags=["Subnets"])
api_router.include_router(ips.router, prefix="/ips", tags=["IP Addresses"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["Discovery"])
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(update.router, prefix="/admin/update", tags=["Admin"])
api_router.include_router(snmp_credentials.router, prefix="/snmp-credentials", tags=["SNMP Credentials"])
api_router.include_router(winrm_credentials.router, prefix="/winrm-credentials", tags=["WinRM Credentials"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(system_logs.router, prefix="/logs", tags=["System Logs"])
api_router.include_router(tags.router, prefix="/tags", tags=["Tags"])
api_router.include_router(custom_fields.router, prefix="/custom-fields", tags=["Custom Fields"])
api_router.include_router(custom_validation_rules.router, prefix="/validation-rules", tags=["Validation Rules"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
