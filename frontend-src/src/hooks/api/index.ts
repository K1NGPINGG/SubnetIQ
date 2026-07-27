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
  DiscoveryRunRequest,
  DiscoveryRunResponse,
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
      const params = limit ? `?limit=${limit}` : "";
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
