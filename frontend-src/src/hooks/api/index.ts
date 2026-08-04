import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/shared/lib/api-client";
import type {
  LoginRequest,
  TokenResponse,
  MFASetupResponse,
  MFAVerifyRequest,
  UserInfo,
  Tenant,
  TenantCreate,
  TenantUpdate,
  User,
  UserCreate,
  UserUpdate,
  Site,
  SiteCreate,
  SiteUpdate,
  VLAN,
  VLANCreate,
  VLANUpdate,
  Subnet,
  SubnetCreate,
  SubnetUpdate,
  SubnetTreeResponse,
  IPAddress,
  IPAddressCreate,
  IPAddressUpdate,
  IPAllocationRequest,
  SubnetUsageResponse,
  DiscoveryScan,
  DiscoveryScanCreate,
  ScanResultsResponse,
  DashboardResponse,
  SubnetUtilizationReport,
  IPHistoryResponse,
  HealthResponse,
  SnmpCredential,
  SnmpCredentialCreate,
  SnmpCredentialUpdate,
  WinRMCredential,
  WinRMCredentialCreate,
  WinRMCredentialUpdate,
  MapLocation,
  Asset,
  AssetDetail,
  AssetListResponse,
  UpdateStatusResponse,
  UpdateRunResponse,  DiscoveryRunRequest,
  DiscoveryRunResponse,
  VRF,
  VRFCreate,
  VRFUpdate,
  RIR,
  RIRCreate,
  RIRUpdate,
  Aggregate,
  AggregateCreate,
  AggregateUpdate,
  AggregateUsageResponse,
  IPRange,
  IPRangeCreate,
  IPRangeUpdate,
  ASN,
  ASNCreate,
  ASNUpdate,
  Tag,
  TagCreate,
  TagUpdate,
  CustomField,
  CustomFieldCreate,
  CustomFieldUpdate,
  ValidationRule,
  ValidationRuleCreate,
  ValidationRuleUpdate,
  ApprovalRequest,
  ApprovalRequestCreate,
  ApprovalDecision,
  Webhook,
  WebhookCreate,
  WebhookUpdate,
  SearchResponse,
} from "@/types/api";

const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

const tenantKeys = {
  all: ["tenants"] as const,
  list: () => [...tenantKeys.all, "list"] as const,
};

const siteKeys = {
  all: ["sites"] as const,
  list: () => [...siteKeys.all, "list"] as const,
};

const vlanKeys = {
  all: ["vlans"] as const,
  list: () => [...vlanKeys.all, "list"] as const,
};

const subnetKeys = {
  all: ["subnets"] as const,
  list: () => [...subnetKeys.all, "list"] as const,
  detail: (id: string) => [...subnetKeys.all, "detail", id] as const,
  tree: (id: string) => [...subnetKeys.all, "tree", id] as const,
};

const ipKeys = {
  all: ["ip-addresses"] as const,
  list: () => [...ipKeys.all, "list"] as const,
  detail: (id: string) => [...ipKeys.all, "detail", id] as const,
  usage: (id: string) => [...ipKeys.all, "usage", id] as const,
};

const discoveryKeys = {
  all: ["discovery"] as const,
  list: () => [...discoveryKeys.all, "list"] as const,
};

const reportKeys = {
  all: ["reports"] as const,
  dashboard: () => [...reportKeys.all, "dashboard"] as const,
  utilization: () => [...reportKeys.all, "utilization"] as const,
  ipHistory: (addr: string) => [...reportKeys.all, "ip-history", addr] as const,
};

const healthKeys = {
  all: ["health"] as const,
  status: () => [...healthKeys.all, "status"] as const,
  db: () => [...healthKeys.all, "db"] as const,
};

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiClient.post<TokenResponse>("/auth/login", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () =>
      apiClient.get<UserInfo>("/auth/me").then((res) => res.data),
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { display_name?: string; email?: string }) =>
      apiClient.put<UserInfo>("/auth/me", data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data);
    },
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: (data: { refresh_token: string }) =>
      apiClient.post<TokenResponse>("/auth/refresh", data).then((res) => res.data),
  });
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<MFASetupResponse>("/auth/mfa/setup").then((res) => res.data),
  });
}

export function useMfaEnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MFAVerifyRequest) =>
      apiClient.post<{ message: string }>("/auth/mfa/enable", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

export function useMfaDisable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string }) =>
      apiClient.post<{ message: string }>("/auth/mfa/disable", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

export function useTenants() {
  return useQuery({
    queryKey: tenantKeys.list(),
    queryFn: () =>
      apiClient.get<Tenant[]>("/tenants").then((res) => res.data),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantCreate) =>
      apiClient.post<Tenant>("/tenants", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenantUpdate }) =>
      apiClient.put<Tenant>(`/tenants/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/tenants/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useSites() {
  return useQuery({
    queryKey: siteKeys.list(),
    queryFn: () =>
      apiClient.get<Site[]>("/sites").then((res) => res.data),
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SiteCreate) =>
      apiClient.post<Site>("/sites", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SiteUpdate }) =>
      apiClient.put<Site>(`/sites/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/sites/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useVlans() {
  return useQuery({
    queryKey: vlanKeys.list(),
    queryFn: () =>
      apiClient.get<VLAN[]>("/vlans").then((res) => res.data),
  });
}

export function useCreateVlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VLANCreate) =>
      apiClient.post<VLAN>("/vlans", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vlanKeys.all });
    },
  });
}

export function useUpdateVlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VLANUpdate }) =>
      apiClient.put<VLAN>(`/vlans/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vlanKeys.all });
    },
  });
}

export function useDeleteVlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/vlans/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vlanKeys.all });
    },
  });
}

export function useSubnets() {
  return useQuery({
    queryKey: subnetKeys.list(),
    queryFn: () =>
      apiClient.get<Subnet[]>("/subnets").then((res) => res.data),
  });
}

export function useSubnet(id: string) {
  return useQuery({
    queryKey: subnetKeys.detail(id),
    queryFn: () =>
      apiClient.get<Subnet>(`/subnets/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useSubnetTree(id: string) {
  return useQuery({
    queryKey: subnetKeys.tree(id),
    queryFn: () =>
      apiClient.get<SubnetTreeResponse>(`/subnets/${id}/tree`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateSubnet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubnetCreate) =>
      apiClient.post<Subnet>("/subnets", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useUpdateSubnet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubnetUpdate }) =>
      apiClient.put<Subnet>(`/subnets/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useDeleteSubnet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/subnets/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useIpAddresses() {
  return useQuery({
    queryKey: ipKeys.list(),
    queryFn: () =>
      apiClient.get<IPAddress[]>("/ips").then((res) => res.data),
  });
}

export function useIpamRecords() {
  return useQuery({
    queryKey: [...ipKeys.all, "records"],
    queryFn: () =>
      apiClient.get<IPAddress[]>("/ips/records").then((res) => res.data),
  });
}

export function useIpAddress(id: string) {
  return useQuery({
    queryKey: ipKeys.detail(id),
    queryFn: () =>
      apiClient.get<IPAddress>(`/ips/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useIpByAddress(address: string) {
  return useQuery({
    queryKey: [...ipKeys.all, "by-address", address],
    queryFn: () =>
      apiClient.get<IPAddress>(`/ips/by-address/${address}`).then((res) => res.data),
    enabled: !!address,
  });
}

export function useSubnetUsage(subnetId: string) {
  return useQuery({
    queryKey: ipKeys.usage(subnetId),
    queryFn: () =>
      apiClient.get<SubnetUsageResponse>(`/ips/usage/${subnetId}`).then((res) => res.data),
    enabled: !!subnetId,
  });
}

export function useCreateIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IPAddressCreate) =>
      apiClient.post<IPAddress>("/ips", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipKeys.all });
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useUpdateIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IPAddressUpdate }) =>
      apiClient.put<IPAddress>(`/ips/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipKeys.all });
    },
  });
}

export function useDeleteIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/ips/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipKeys.all });
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useAllocateIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IPAllocationRequest) =>
      apiClient.post<IPAddress>("/ips/allocate", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ipKeys.all });
      queryClient.invalidateQueries({ queryKey: subnetKeys.all });
    },
  });
}

export function useDiscoveryScans() {
  return useQuery({
    queryKey: discoveryKeys.list(),
    queryFn: () =>
      apiClient.get<DiscoveryScan[]>("/discovery").then((res) => res.data),
    refetchInterval: (query) => {
      const scans = query.state.data;
      const active = (scans ?? []).some((s) =>
        ["pending", "running", "scheduled"].includes(s.status)
      );
      return active ? 5000 : false;
    },
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiscoveryScanCreate) =>
      apiClient.post<DiscoveryScan>("/discovery", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}

export function useCancelScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DiscoveryScan>(`/discovery/${id}/cancel`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/discovery/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}

export function useRunScanNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DiscoveryScan>(`/discovery/${id}/run-now`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}

export function useLatestScan(subnetId: string) {
  return useQuery({
    queryKey: [...discoveryKeys.all, "latest", subnetId],
    queryFn: () =>
      apiClient.get<ScanResultsResponse>(`/discovery/latest/${subnetId}`).then((res) => res.data),
    enabled: !!subnetId,
  });
}

export function useDashboard(limit?: number) {
  return useQuery({
    queryKey: [...reportKeys.dashboard(), limit],
    queryFn: () => {
      const params = typeof limit === "number" ? `?limit=${limit}` : "";
      return apiClient.get<DashboardResponse>(`/reports/dashboard${params}`).then((res) => res.data);
    },
  });
}

export function useSubnetUtilization() {
  return useQuery({
    queryKey: reportKeys.utilization(),
    queryFn: () =>
      apiClient.get<SubnetUtilizationReport>("/reports/subnet-utilization").then((res) => res.data),
  });
}

export function useIpHistory(address: string) {
  return useQuery({
    queryKey: reportKeys.ipHistory(address),
    queryFn: () =>
      apiClient.get<IPHistoryResponse>(`/reports/ip-history/${address}`).then((res) => res.data),
    enabled: !!address,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: () =>
      apiClient.get<HealthResponse>("/health").then((res) => res.data),
    refetchInterval: 30000,
  });
}

export function useDbHealth() {
  return useQuery({
    queryKey: healthKeys.db(),
    queryFn: () =>
      apiClient.get<HealthResponse>("/health/db").then((res) => res.data),
    refetchInterval: 30000,
  });
}

// ── Admin / Users ─────────────────────────────────────────────────────

const adminKeys = {
  all: ["admin"] as const,
  users: () => [...adminKeys.all, "users"] as const,
};

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () =>
      apiClient.get<User[]>("/admin/users").then((res) => res.data),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreate) =>
      apiClient.post<User>("/admin/users", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      apiClient.put<User>(`/admin/users/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/users/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// ── Admin / Updates ────────────────────────────────────────────────────

const updateKeys = {
  all: ["admin", "update"] as const,
  status: () => [...updateKeys.all, "status"] as const,
};

export function useUpdateStatus() {
  return useQuery({
    queryKey: updateKeys.status(),
    queryFn: () =>
      apiClient.get<UpdateStatusResponse>("/admin/update/status").then((res) => res.data),
    // Poll fast (3s) only while an update is running to drive the progress bar;
    // otherwise poll slowly (60s) — GitHub release checks are cached server-side.
    refetchInterval: (query) =>
      (query.state.data as UpdateStatusResponse | undefined)?.state?.status === "running"
        ? 3000
        : 60000,
  });
}

export function useCheckUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<UpdateStatusResponse>("/admin/update/check").then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(updateKeys.status(), data);
    },
  });
}

export function useRunUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag?: string) =>
      apiClient.post<UpdateRunResponse>("/admin/update/run", tag ? { tag } : {}).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: updateKeys.status() });
    },
  });
}

// ── SNMP Credentials ───────────────────────────────────────────────────

const snmpKeys = {
  all: ["snmp-credentials"] as const,
  list: () => [...snmpKeys.all, "list"] as const,
};

export function useSnmpCredentials() {
  return useQuery({
    queryKey: snmpKeys.list(),
    queryFn: () =>
      apiClient.get<SnmpCredential[]>("/snmp-credentials").then((res) => res.data),
  });
}

export function useCreateSnmpCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SnmpCredentialCreate) =>
      apiClient.post<SnmpCredential>("/snmp-credentials", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snmpKeys.all });
    },
  });
}

export function useUpdateSnmpCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SnmpCredentialUpdate }) =>
      apiClient.put<SnmpCredential>(`/snmp-credentials/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snmpKeys.all });
    },
  });
}

export function useDeleteSnmpCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/snmp-credentials/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snmpKeys.all });
    },
  });
}

// ── WinRM Credentials ────────────────────────────────────────────────

const winrmKeys = {
  all: ["winrm-credentials"] as const,
  list: () => [...winrmKeys.all, "list"] as const,
};

export function useWinrmCredentials() {
  return useQuery({
    queryKey: winrmKeys.list(),
    queryFn: () =>
      apiClient.get<WinRMCredential[]>("/winrm-credentials").then((res) => res.data),
  });
}

export function useCreateWinrmCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WinRMCredentialCreate) =>
      apiClient.post<WinRMCredential>("/winrm-credentials", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: winrmKeys.all });
    },
  });
}

export function useUpdateWinrmCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WinRMCredentialUpdate }) =>
      apiClient.put<WinRMCredential>(`/winrm-credentials/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: winrmKeys.all });
    },
  });
}

export function useDeleteWinrmCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/winrm-credentials/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: winrmKeys.all });
    },
  });
}

const mapKeys = {
  all: ["map"] as const,
  data: () => [...mapKeys.all, "data"] as const,
};

export function useMapData() {
  return useQuery({
    queryKey: mapKeys.data(),
    queryFn: () =>
      apiClient.get<MapLocation[]>("/reports/map-data").then((res) => res.data),
  });
}

const auditKeys = {
  all: ["audit"] as const,
  list: (params: Record<string, unknown>) => [...auditKeys.all, "list", params] as const,
  entityTypes: () => [...auditKeys.all, "entityTypes"] as const,
  actions: () => [...auditKeys.all, "actions"] as const,
};

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface AuditLogResponse {
  total: number;
  logs: AuditLogEntry[];
}

export function useAuditLogs(params: {
  entity_type?: string;
  action?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.entity_type) searchParams.set("entity_type", params.entity_type);
      if (params.action) searchParams.set("action", params.action);
      if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
      if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
      return apiClient
        .get<AuditLogResponse>(`/audit/?${searchParams.toString()}`)
        .then((res) => res.data);
    },
  });
}

export function useAuditEntityTypes() {
  return useQuery({
    queryKey: auditKeys.entityTypes(),
    queryFn: () =>
      apiClient.get<string[]>("/audit/entity-types").then((res) => res.data),
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: auditKeys.actions(),
    queryFn: () =>
      apiClient.get<string[]>("/audit/actions").then((res) => res.data),
  });
}

/** Recent activity feed for the dashboard (admin-only data; fails gracefully). */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: [...auditKeys.all, "recent", limit],
    queryFn: async () => {
      try {
        const res = await apiClient.get<AuditLogResponse>(`/audit/?limit=${limit}`);
        return res.data.logs ?? [];
      } catch {
        return [] as AuditLogEntry[];
      }
    },
    refetchInterval: 30000,
  });
}

// ── Backups ────────────────────────────────────────────────────────────────

export interface BackupEntry {
  filename: string;
  size: number;
  created_at: string;
  kind: "manual" | "automated";
}

const backupKeys = {
  all: ["backups"] as const,
};

export function useBackups() {
  return useQuery({
    queryKey: backupKeys.all,
    queryFn: () =>
      apiClient.get<{ backups: BackupEntry[] }>("/system/backups").then((r) => r.data.backups),
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/system/backups/create").then((r) => r.data),
    onSuccess: () => {
      // Creation runs asynchronously in Celery; refresh the list shortly after.
      setTimeout(() => qc.invalidateQueries({ queryKey: backupKeys.all }), 15000);
    },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) =>
      apiClient.delete(`/system/backups/${encodeURIComponent(filename)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: backupKeys.all }),
  });
}

export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient
        .post("/system/backups/restore", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: backupKeys.all }),
  });
}

export async function downloadBackup(filename: string): Promise<void> {
  const res = await apiClient.get(`/system/backups/${encodeURIComponent(filename)}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const systemLogKeys = {
  all: ["system-logs"] as const,
  list: () => [...systemLogKeys.all, "list"] as const,
  levels: () => [...systemLogKeys.all, "levels"] as const,
  categories: () => [...systemLogKeys.all, "categories"] as const,
  sources: () => [...systemLogKeys.all, "sources"] as const,
};

export interface SystemLogEntry {
  id: string;
  level: string;
  category: string;
  message: string;
  details: string | null;
  source: string | null;
  entity_type: string | null;
  entity_id: string | null;
  task_id: string | null;
  duration_ms: number | null;
  ip_address: string | null;
  user_id: string | null;
  created_at: string;
}

export interface SystemLogResponse {
  logs: SystemLogEntry[];
  total: number;
}

export function useSystemLogs(params: {
  level?: string;
  category?: string;
  source?: string;
  search?: string;
  skip?: number;
  limit?: number;
} = {}) {
  return useQuery<SystemLogResponse>({
    queryKey: [...systemLogKeys.list(), params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.level) searchParams.set("level", params.level);
      if (params.category) searchParams.set("category", params.category);
      if (params.source) searchParams.set("source", params.source);
      if (params.search) searchParams.set("search", params.search);
      if (params.skip != null) searchParams.set("skip", String(params.skip));
      if (params.limit != null) searchParams.set("limit", String(params.limit));
      return apiClient.get(`/logs/?${searchParams}`).then((res) => res.data);
    },
  });
}

export function useSystemLogLevels() {
  return useQuery({
    queryKey: systemLogKeys.levels(),
    queryFn: () => apiClient.get<string[]>("/logs/levels").then((res) => res.data),
  });
}

export function useSystemLogCategories() {
  return useQuery({
    queryKey: systemLogKeys.categories(),
    queryFn: () => apiClient.get<string[]>("/logs/categories").then((res) => res.data),
  });
}

export function useSystemLogSources() {
  return useQuery({
    queryKey: systemLogKeys.sources(),
    queryFn: () => apiClient.get<string[]>("/logs/sources").then((res) => res.data),
  });
}

// ── Assets / Discovered Devices ─────────────────────────────────────

const assetKeys = {
  all: ["assets"] as const,
  list: (params: Record<string, unknown>) => [...assetKeys.all, "list", params] as const,
  detail: (id: string) => [...assetKeys.all, "detail", id] as const,
};

export function useAssets(params: {
  search?: string;
  discovery_source?: string;
  device_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery<AssetListResponse>({
    queryKey: assetKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.discovery_source) searchParams.set("discovery_source", params.discovery_source);
      if (params.device_type) searchParams.set("device_type", params.device_type);
      if (params.status) searchParams.set("status", params.status);
      if (params.page != null) searchParams.set("page", String(params.page));
      if (params.page_size != null) searchParams.set("page_size", String(params.page_size));
      return apiClient.get<AssetListResponse>(`/assets?${searchParams.toString()}`).then((res) => res.data);
    },
  });
}

export function useAsset(id: string) {
  return useQuery<AssetDetail>({
    queryKey: assetKeys.detail(id),
    queryFn: () =>
      apiClient.get<AssetDetail>(`/assets/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useRunDiscovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiscoveryRunRequest) =>
      apiClient.post<DiscoveryRunResponse>("/discovery/run", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

// ── VRFs ────────────────────────────────────────────────────────────────

const vrfKeys = {
  all: ["vrfs"] as const,
  list: () => [...vrfKeys.all, "list"] as const,
};

export function useVrfs() {
  return useQuery({
    queryKey: vrfKeys.list(),
    queryFn: () => apiClient.get<VRF[]>("/vrfs").then((res) => res.data),
  });
}

export function useCreateVrf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VRFCreate) =>
      apiClient.post<VRF>("/vrfs", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vrfKeys.all }),
  });
}

export function useUpdateVrf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VRFUpdate }) =>
      apiClient.put<VRF>(`/vrfs/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vrfKeys.all }),
  });
}

export function useDeleteVrf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/vrfs/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vrfKeys.all }),
  });
}

// ── RIRs ────────────────────────────────────────────────────────────────

const rirKeys = {
  all: ["rirs"] as const,
  list: () => [...rirKeys.all, "list"] as const,
};

export function useRirs() {
  return useQuery({
    queryKey: rirKeys.list(),
    queryFn: () => apiClient.get<RIR[]>("/rirs").then((res) => res.data),
  });
}

export function useCreateRir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RIRCreate) =>
      apiClient.post<RIR>("/rirs", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rirKeys.all }),
  });
}

export function useUpdateRir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RIRUpdate }) =>
      apiClient.put<RIR>(`/rirs/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rirKeys.all }),
  });
}

export function useDeleteRir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/rirs/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rirKeys.all }),
  });
}

// ── Aggregates ──────────────────────────────────────────────────────────

const aggregateKeys = {
  all: ["aggregates"] as const,
  list: () => [...aggregateKeys.all, "list"] as const,
  usage: (id: string) => [...aggregateKeys.all, "usage", id] as const,
};

export function useAggregates() {
  return useQuery({
    queryKey: aggregateKeys.list(),
    queryFn: () => apiClient.get<Aggregate[]>("/aggregates").then((res) => res.data),
  });
}

export function useCreateAggregate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AggregateCreate) =>
      apiClient.post<Aggregate>("/aggregates", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aggregateKeys.all }),
  });
}

export function useUpdateAggregate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AggregateUpdate }) =>
      apiClient.put<Aggregate>(`/aggregates/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aggregateKeys.all }),
  });
}

export function useDeleteAggregate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/aggregates/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aggregateKeys.all }),
  });
}

export function useAggregateUsage(id: string) {
  return useQuery({
    queryKey: aggregateKeys.usage(id),
    queryFn: () =>
      apiClient.get<AggregateUsageResponse>(`/aggregates/${id}/usage`).then((res) => res.data),
    enabled: !!id,
  });
}

// ── IP Ranges ───────────────────────────────────────────────────────────

const ipRangeKeys = {
  all: ["ip-ranges"] as const,
  list: () => [...ipRangeKeys.all, "list"] as const,
};

export function useIpRanges() {
  return useQuery({
    queryKey: ipRangeKeys.list(),
    queryFn: () => apiClient.get<IPRange[]>("/ip-ranges").then((res) => res.data),
  });
}

export function useCreateIpRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IPRangeCreate) =>
      apiClient.post<IPRange>("/ip-ranges", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ipRangeKeys.all }),
  });
}

export function useUpdateIpRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IPRangeUpdate }) =>
      apiClient.put<IPRange>(`/ip-ranges/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ipRangeKeys.all }),
  });
}

export function useDeleteIpRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/ip-ranges/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ipRangeKeys.all }),
  });
}

// ── ASNs ────────────────────────────────────────────────────────────────

const asnKeys = {
  all: ["asns"] as const,
  list: () => [...asnKeys.all, "list"] as const,
};

export function useAsns() {
  return useQuery({
    queryKey: asnKeys.list(),
    queryFn: () => apiClient.get<ASN[]>("/asns").then((res) => res.data),
  });
}

export function useCreateAsn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ASNCreate) =>
      apiClient.post<ASN>("/asns", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: asnKeys.all }),
  });
}

export function useUpdateAsn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ASNUpdate }) =>
      apiClient.put<ASN>(`/asns/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: asnKeys.all }),
  });
}

export function useDeleteAsn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/asns/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: asnKeys.all }),
  });
}

// ── Tags ────────────────────────────────────────────────────────────────

const tagKeys = {
  all: ["tags"] as const,
  list: () => [...tagKeys.all, "list"] as const,
};

export function useTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: () => apiClient.get<Tag[]>("/tags").then((res) => res.data),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TagCreate) =>
      apiClient.post<Tag>("/tags", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TagUpdate }) =>
      apiClient.put<Tag>(`/tags/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/tags/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

// ── Custom Fields ───────────────────────────────────────────────────────

const customFieldKeys = {
  all: ["custom-fields"] as const,
  list: () => [...customFieldKeys.all, "list"] as const,
};

export function useCustomFields() {
  return useQuery({
    queryKey: customFieldKeys.list(),
    queryFn: () => apiClient.get<CustomField[]>("/custom-fields").then((res) => res.data),
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldCreate) =>
      apiClient.post<CustomField>("/custom-fields", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.all }),
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomFieldUpdate }) =>
      apiClient.put<CustomField>(`/custom-fields/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.all }),
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/custom-fields/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.all }),
  });
}

// ── Validation Rules ────────────────────────────────────────────────────

const validationRuleKeys = {
  all: ["validation-rules"] as const,
  list: () => [...validationRuleKeys.all, "list"] as const,
};

export function useValidationRules() {
  return useQuery({
    queryKey: validationRuleKeys.list(),
    queryFn: () => apiClient.get<ValidationRule[]>("/validation-rules").then((res) => res.data),
  });
}

export function useCreateValidationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ValidationRuleCreate) =>
      apiClient.post<ValidationRule>("/validation-rules", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: validationRuleKeys.all }),
  });
}

export function useUpdateValidationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ValidationRuleUpdate }) =>
      apiClient.put<ValidationRule>(`/validation-rules/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: validationRuleKeys.all }),
  });
}

export function useDeleteValidationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/validation-rules/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: validationRuleKeys.all }),
  });
}

// ── Approvals ───────────────────────────────────────────────────────────

const approvalKeys = {
  all: ["approvals"] as const,
  list: (params: Record<string, unknown>) => [...approvalKeys.all, "list", params] as const,
};

export function useApprovals(params: { status?: string; request_type?: string } = {}) {
  return useQuery({
    queryKey: approvalKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set("status", params.status);
      if (params.request_type) searchParams.set("request_type", params.request_type);
      return apiClient
        .get<ApprovalRequest[]>(`/approvals?${searchParams.toString()}`)
        .then((res) => res.data);
    },
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ip_id, data }: { ip_id: string; data: ApprovalRequestCreate }) =>
      apiClient.post<ApprovalRequest>(`/approvals/ip/${ip_id}/release`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApprovalDecision }) =>
      apiClient.post<ApprovalRequest>(`/approvals/${id}/approve`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApprovalDecision }) =>
      apiClient.post<ApprovalRequest>(`/approvals/${id}/reject`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

// ── Webhooks ────────────────────────────────────────────────────────────

const webhookKeys = {
  all: ["webhooks"] as const,
  list: () => [...webhookKeys.all, "list"] as const,
};

export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.list(),
    queryFn: () => apiClient.get<Webhook[]>("/webhooks").then((res) => res.data),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WebhookCreate) =>
      apiClient.post<Webhook>("/webhooks", data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WebhookUpdate }) =>
      apiClient.put<Webhook>(`/webhooks/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/webhooks/${id}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

// ── Global Search ───────────────────────────────────────────────────────

const searchKeys = {
  all: ["search"] as const,
  results: (q: string) => [...searchKeys.all, "results", q] as const,
};

export function useSearch(q: string) {
  return useQuery({
    queryKey: searchKeys.results(q),
    queryFn: () => {
      const params = new URLSearchParams({ q });
      return apiClient.get<SearchResponse>(`/search?${params.toString()}`).then((res) => res.data);
    },
    enabled: q.trim().length >= 2,
  });
}
