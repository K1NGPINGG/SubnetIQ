export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  requires_mfa: boolean;
  user: UserInfo | null;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface MFASetupResponse {
  secret: string;
  provisioning_uri: string;
  qr_code_url: string;
}

export interface MFAVerifyRequest {
  token: string;
  code: string;
}

export interface UserInfo {
  id: string;
  email: string;
  display_name: string;
  role: string;
  tenant_id: string;
  mfa_enabled?: boolean;
  mfa_enforced?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantCreate {
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
}

export interface TenantUpdate {
  name?: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
  is_active?: boolean;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_enforced: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  display_name: string;
  role: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  display_name?: string;
  role?: string;
  is_active?: boolean;
  mfa_enforced?: boolean;
  password?: string;
}

export interface Site {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface SiteUpdate {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface VLAN {
  id: string;
  tenant_id: string;
  vlan_id: number;
  name: string;
  description: string | null;
  site_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VLANCreate {
  vlan_id: number;
  name: string;
  description?: string;
  site_id?: string;
}

export interface VLANUpdate {
  vlan_id?: number;
  name?: string;
  description?: string;
  site_id?: string;
}

export interface Subnet {
  id: string;
  tenant_id: string;
  network_address: string;
  prefix_length: number;
  name: string;
  description: string | null;
  gateway: string | null;
  dns_servers: string | null;
  site_id: string | null;
  vlan_id: string | null;
  parent_subnet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubnetCreate {
  network_address: string;
  prefix_length: number;
  name: string;
  description?: string;
  gateway?: string;
  dns_servers?: string;
  site_id?: string;
  vlan_id?: string;
  parent_subnet_id?: string;
}

export interface SubnetUpdate {
  name?: string;
  description?: string;
  gateway?: string;
  dns_servers?: string;
  site_id?: string;
  vlan_id?: string;
  parent_subnet_id?: string;
}

export interface SubnetTreeResponse {
  subnet: Subnet;
  children: Subnet[];
}

export interface IPAddress {
  id: string;
  tenant_id: string;
  address: string;
  subnet_id: string;
  hostname: string | null;
  status: string;
  mac_address: string | null;
  device_type: string | null;
  description: string | null;
  assigned_to: string | null;
  allocated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPAddressCreate {
  address: string;
  subnet_id: string;
  hostname?: string;
  status?: string;
  mac_address?: string;
  device_type?: string;
  description?: string;
  assigned_to?: string;
}

export interface IPAddressUpdate {
  hostname?: string;
  status?: string;
  mac_address?: string;
  device_type?: string;
  description?: string;
  assigned_to?: string;
  subnet_id?: string;
  expires_at?: string;
}

export interface IPAllocationRequest {
  subnet_id: string;
  hostname?: string;
  device_type?: string;
  description?: string;
  assigned_to?: string;
}

export interface IPAddressBulkCreateRequest {
  addresses: IPAddressCreate[];
}

export interface SubnetUsageResponse {
  subnet_id: string;
  network: string;
  total_ips: number;
  usable_hosts: number;
  allocated: number;
  reserved: number;
  available: number;
  utilization_pct: number;
}

export interface DiscoveryScan {
  id: string;
  tenant_id: string;
  subnet_id: string;
  scan_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  results: unknown | null;
  error_message: string | null;
  snmp_credential_id: string | null;
  is_scheduled: boolean;
  schedule_time: string | null;
  is_recursive: boolean;
  interval_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryScanCreate {
  subnet_id: string;
  scan_type?: string;
  snmp_credential_id?: string | null;
  is_scheduled?: boolean;
  schedule_time?: string;
  schedule_preset?: string;
  is_recursive?: boolean;
  interval_minutes?: number;
}

export interface ScanResultsResponse {
  scan_id: string;
  subnet_id: string;
  scan_type: string;
  status: string;
  completed_at: string | null;
  results: {
    discovered_hosts: DiscoveredHost[];
    total_hosts_scanned: number;
    alive_hosts: number;
    dead_hosts: number;
  } | null;
}

export interface DiscoveredHost {
  address: string;
  is_alive: boolean;
  response_time_ms?: number | null;
  hostname?: string | null;
  mac_address?: string | null;
  scan_method?: string;
  sys_descr?: string | null;
  in_database?: boolean;
  db_hostname?: string | null;
  db_status?: string;
  db_device_type?: string | null;
  db_assigned_to?: string | null;
}

export interface DashboardSummary {
  total_sites: number;
  total_vlans: number;
  total_subnets: number;
  total_ips: number;
  allocated_ips: number;
  reserved_ips: number;
  available_ips: number;
  unused_ips: number;
}

export interface SubnetUtilization {
  subnet_id: string;
  name: string;
  network: string;
  total_ips: number;
  used: number;
  utilization_pct: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  top_subnets_by_utilization: SubnetUtilization[];
}

export interface SubnetUtilizationReport {
  all_subnets: SubnetUtilizationDetail[];
  flagged_subnets: SubnetUtilizationDetail[];
  flagged_count: number;
}

export interface SubnetUtilizationDetail {
  subnet_id: string;
  name: string;
  network: string;
  site_id: string | null;
  total_ips: number;
  used: number;
  available: number;
  utilization_pct: number;
  exceeds_threshold: boolean;
}

export interface IPHistoryResponse {
  address: string;
  current_status: {
    status: string;
    hostname: string | null;
    assigned_to: string | null;
    device_type: string | null;
  };
  history: IPHistoryEntry[];
}

export interface IPHistoryEntry {
  action: string;
  user_id: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  service?: string;
  database?: string;
  version?: string;
}

export interface LatestRelease {
  tag_name: string;
  name: string;
  published_at: string | null;
  html_url: string;
}

export interface UpdateState {
  status: "idle" | "running" | "success" | "failed";
  tag?: string;
  started_at?: string;
  finished_at?: string;
}

export interface UpdateStatusResponse {
  enabled: boolean;
  message?: string;
  current_version: string;
  latest_release: LatestRelease | null;
  update_available: boolean;
  state: UpdateState | null;
  log_tail: string;
}

export interface UpdateRunResponse {
  accepted: boolean;
  tag: string;
  triggered_at: string;
}

export interface SnmpCredential {
  id: string;
  tenant_id: string;
  name: string;
  version: string;
  community_string: string | null;
  v3_username: string | null;
  v3_auth_protocol: string | null;
  v3_auth_passphrase: string | null;
  v3_priv_protocol: string | null;
  v3_priv_passphrase: string | null;
  v3_security_level: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SnmpCredentialCreate {
  name: string;
  version: string;
  community_string?: string;
  v3_username?: string;
  v3_auth_protocol?: string;
  v3_auth_passphrase?: string;
  v3_priv_protocol?: string;
  v3_priv_passphrase?: string;
  v3_security_level?: string;
}

export interface SnmpCredentialUpdate {
  name?: string;
  version?: string;
  community_string?: string;
  v3_username?: string;
  v3_auth_protocol?: string;
  v3_auth_passphrase?: string;
  v3_priv_protocol?: string;
  v3_priv_passphrase?: string;
  v3_security_level?: string;
  is_active?: boolean;
}

export interface WinRMCredential {
  id: string;
  tenant_id: string;
  name: string;
  username: string;
  port: number;
  use_ssl: boolean;
  auth_type: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WinRMCredentialCreate {
  name: string;
  username: string;
  password: string;
  port?: number;
  use_ssl?: boolean;
  auth_type?: string;
  domain?: string;
}

export interface WinRMCredentialUpdate {
  name?: string;
  username?: string;
  password?: string;
  port?: number;
  use_ssl?: boolean;
  auth_type?: string;
  domain?: string;
  is_active?: boolean;
}

export interface MapNetwork {
  subnet_name: string;
  cidr: string;
  vlan_tag: number | null;
  allocated_ips: number;
  total_ips: number;
}

export interface MapLocation {
  site_id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  networks: MapNetwork[];
}

// ── Asset / Discovered Device ───────────────────────────────────────

export interface Asset {
  id: string;
  tenant_id: string;
  ip_address: string;
  mac_address: string | null;
  hostname: string | null;
  domain: string | null;
  device_type: string | null;
  discovery_source: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  os_name: string | null;
  os_version: string | null;
  cpu_cores: number | null;
  ram_gb: number | null;
  status: string;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetDetail extends Asset {
  raw_scan_data: Record<string, unknown> | null;
  network_interfaces: NetworkInterface[] | null;
}

export interface NetworkInterface {
  index?: number;
  name: string;
  mac: string | null;
  ip: string | null;
  subnet: string | null;
  status?: string;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  page_size: number;
}

export interface DiscoveryRunRequest {
  scan_type: string;
  target_ips?: string[];
  subnet_id?: string;
  snmp_credential_id?: string;
  snmp_community?: string;
  winrm_credential_id?: string;
  winrm_username?: string;
  winrm_password?: string;
  winrm_port?: number;
  winrm_use_ssl?: boolean;
}

export interface DiscoveryRunResponse {
  task_id: string;
  scan_type: string;
  target_count: number;
  message: string;
}

// ── Address Hierarchy (VRFs, RIRs, Aggregates, IP Ranges, ASNs) ────

export interface VRF {
  id: string;
  tenant_id: string;
  name: string;
  rd: string | null;
  description: string | null;
  enforce_unique: boolean;
  created_at: string;
  updated_at: string;
}

export interface VRFCreate {
  name: string;
  rd?: string | null;
  description?: string | null;
  enforce_unique?: boolean;
}

export interface VRFUpdate {
  name?: string;
  rd?: string | null;
  description?: string | null;
  enforce_unique?: boolean;
}

export interface RIR {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RIRCreate {
  name: string;
  slug: string;
  description?: string | null;
}

export interface RIRUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
}

export interface Aggregate {
  id: string;
  tenant_id: string;
  network_address: string;
  prefix_length: number;
  description: string | null;
  rir_id: string | null;
  family: number;
  created_at: string;
  updated_at: string;
}

export interface AggregateCreate {
  network_address: string;
  prefix_length: number;
  description?: string | null;
  rir_id?: string | null;
}

export interface AggregateUpdate {
  description?: string | null;
  rir_id?: string | null;
}

export interface AggregateUsageResponse {
  aggregate_id: string;
  network: string;
  total_ips: number;
  used_ips: number;
  utilization_pct: number;
}

export interface IPRange {
  id: string;
  tenant_id: string;
  subnet_id: string;
  start_address: string;
  end_address: string;
  status: string;
  description: string | null;
  family: number;
  created_at: string;
  updated_at: string;
}

export interface IPRangeCreate {
  subnet_id: string;
  start_address: string;
  end_address: string;
  status?: string;
  description?: string | null;
}

export interface IPRangeUpdate {
  start_address?: string;
  end_address?: string;
  status?: string;
  description?: string | null;
}

export interface ASN {
  id: string;
  tenant_id: string;
  asn: number;
  description: string | null;
  rir_id: string | null;
  site_id: string | null;
  is_32bit: boolean;
  created_at: string;
  updated_at: string;
}

export interface ASNCreate {
  asn: number;
  description?: string | null;
  rir_id?: string | null;
  site_id?: string | null;
}

export interface ASNUpdate {
  description?: string | null;
  rir_id?: string | null;
  site_id?: string | null;
}

// ── Tags, Custom Fields, Validation Rules ─────────────────────────

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagCreate {
  name: string;
  slug: string;
  color?: string;
  description?: string | null;
}

export interface TagUpdate {
  name?: string;
  slug?: string;
  color?: string;
  description?: string | null;
}

export interface CustomField {
  id: string;
  name: string;
  label: string | null;
  applies_to: string;
  field_type: string;
  required: boolean;
  default_value: string | null;
  choices: string[] | null;
  description: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldCreate {
  name: string;
  label?: string | null;
  applies_to: string;
  field_type?: string;
  required?: boolean;
  default_value?: string | null;
  choices?: string[] | null;
  description?: string | null;
  weight?: number;
}

export interface CustomFieldUpdate {
  name?: string;
  label?: string | null;
  applies_to?: string;
  field_type?: string;
  required?: boolean;
  default_value?: string | null;
  choices?: string[] | null;
  description?: string | null;
  weight?: number;
}

export interface ValidationRule {
  id: string;
  name: string;
  entity_type: string;
  condition: Record<string, unknown> | null;
  error_message: string;
  enabled: boolean;
  enforce_on_delete: boolean;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface ValidationRuleCreate {
  name: string;
  entity_type: string;
  condition?: Record<string, unknown> | null;
  error_message: string;
  enabled?: boolean;
  enforce_on_delete?: boolean;
  weight?: number;
}

export interface ValidationRuleUpdate {
  name?: string;
  entity_type?: string;
  condition?: Record<string, unknown> | null;
  error_message?: string;
  enabled?: boolean;
  enforce_on_delete?: boolean;
  weight?: number;
}

// ── Approvals ─────────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  request_type: string;
  status: string;
  reason: string | null;
  ip_address_id: string;
  requested_by: string;
  approved_by: string | null;
  decision_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestCreate {
  request_type?: string;
  reason?: string | null;
}

export interface ApprovalDecision {
  notes?: string | null;
}

// ── Webhooks ─────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  http_method: string;
  secret: string | null;
  events: string[] | null;
  headers: Record<string, string> | null;
  enabled: boolean;
  ssl_verify: boolean;
  timeout: number;
  retry_count: number;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  http_method?: string;
  secret?: string | null;
  events?: string[] | null;
  headers?: Record<string, string> | null;
  enabled?: boolean;
  ssl_verify?: boolean;
  timeout?: number;
  retry_count?: number;
}

export interface WebhookUpdate {
  name?: string;
  url?: string;
  http_method?: string;
  secret?: string | null;
  events?: string[] | null;
  headers?: Record<string, string> | null;
  enabled?: boolean;
  ssl_verify?: boolean;
  timeout?: number;
  retry_count?: number;
}

// ── Global Search ────────────────────────────────────────────────

export interface SearchResult {
  kind: string;
  id: string;
  label: string;
  secondary: string;
  status?: string;
  family?: number;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
}
