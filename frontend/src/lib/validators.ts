import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const tenantCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  logo_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .or(z.literal("")),
});

export const tenantUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logo_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

export const siteCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z
    .string()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Code must contain only uppercase letters, numbers, and hyphens"),
  address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const siteUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const vlanCreateSchema = z.object({
  vlan_id: z
    .number()
    .int("VLAN ID must be an integer")
    .min(1, "VLAN ID must be at least 1")
    .max(4094, "VLAN ID must be at most 4094"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  site_id: z.string().uuid("Invalid site ID").optional().nullable(),
});

export const vlanUpdateSchema = z.object({
  vlan_id: z
    .number()
    .int()
    .min(1)
    .max(4094)
    .optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  site_id: z.string().uuid().optional().nullable(),
});

export const subnetCreateSchema = z.object({
  network_address: z
    .string()
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/,
      "Invalid network address (e.g., 192.168.1.0/24)"
    ),
  prefix_length: z
    .number()
    .int("Prefix length must be an integer")
    .min(0, "Prefix length must be at least 0")
    .max(32, "Prefix length must be at most 32"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  gateway: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid gateway IP address")
    .optional()
    .or(z.literal("")),
  dns_servers: z.string().max(500).optional().or(z.literal("")),
  site_id: z.string().uuid("Invalid site ID").optional().nullable(),
  vlan_id: z.string().uuid("Invalid VLAN ID").optional().nullable(),
  parent_subnet_id: z
    .string()
    .uuid("Invalid parent subnet ID")
    .optional()
    .nullable(),
});

export const subnetUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  gateway: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/)
    .optional()
    .or(z.literal("")),
  dns_servers: z.string().max(500).optional().or(z.literal("")),
  site_id: z.string().uuid().optional().nullable(),
  vlan_id: z.string().uuid().optional().nullable(),
  parent_subnet_id: z.string().uuid().optional().nullable(),
});

export const ipAddressCreateSchema = z.object({
  address: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
  subnet_id: z.string().uuid("Invalid subnet ID"),
  hostname: z.string().max(255).optional().or(z.literal("")),
  status: z
    .enum(["allocated", "reserved", "available", "unavailable"], {
      errorMap: () => ({ message: "Invalid status" }),
    })
    .optional(),
  mac_address: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      "Invalid MAC address format"
    )
    .optional()
    .or(z.literal("")),
  device_type: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  assigned_to: z.string().max(255).optional().or(z.literal("")),
});

export const ipAddressUpdateSchema = z.object({
  hostname: z.string().max(255).optional().or(z.literal("")),
  status: z
    .enum(["allocated", "reserved", "available", "unavailable"])
    .optional(),
  mac_address: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .optional()
    .or(z.literal("")),
  device_type: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  assigned_to: z.string().max(255).optional().or(z.literal("")),
  subnet_id: z.string().uuid().optional(),
  expires_at: z
    .string()
    .datetime("Invalid datetime format")
    .optional()
    .nullable(),
});

export const ipAllocationSchema = z.object({
  subnet_id: z.string().uuid("Invalid subnet ID"),
  hostname: z.string().max(255).optional().or(z.literal("")),
  device_type: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  assigned_to: z.string().max(255).optional().or(z.literal("")),
});

export const adminUserCreateSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "viewer"], { errorMap: () => ({ message: "Invalid role" }) }),
});

export const adminUserUpdateSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "viewer"]).optional(),
  is_active: z.boolean().optional(),
  mfa_enforced: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const discoveryScanCreateSchema = z.object({
  subnet_id: z.string().uuid("Invalid subnet ID"),
  scan_type: z
    .enum(["ping", "arp", "snmp", "icmp_and_snmp", "full"], {
      errorMap: () => ({ message: "Invalid scan type" }),
    })
    .optional(),
  snmp_credential_id: z.string().uuid().optional().nullable(),
  is_scheduled: z.boolean().default(false),
  schedule_time: z.string().optional().nullable(),
  schedule_preset: z.string().optional(),
  is_recursive: z.boolean().default(false),
  interval_minutes: z.number().optional().nullable(),
});

export const discoveryRunSchema = z.object({
  scan_type: z.enum(["SNMP", "WINRM", "PING", "FULL"], {
    errorMap: () => ({ message: "Invalid scan type. Use SNMP, WINRM, PING, or FULL." }),
  }),
  target_ips: z.array(z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP")).optional(),
  subnet_id: z.string().uuid().optional(),
  snmp_credential_id: z.string().uuid().optional().nullable(),
  snmp_community: z.string().optional(),
  winrm_username: z.string().optional(),
  winrm_password: z.string().optional(),
  winrm_port: z.number().int().min(1).max(65535).optional(),
  winrm_use_ssl: z.boolean().optional(),
});

// ── VRFs ───────────────────────────────────────────────────────────────

export const vrfCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  rd: z.string().max(50).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  enforce_unique: z.boolean().default(true),
});

export const vrfUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rd: z.string().max(50).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  enforce_unique: z.boolean().optional(),
});

// ── RIRs ───────────────────────────────────────────────────────────────

export const rirCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const rirUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(30).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
});

// ── Aggregates ─────────────────────────────────────────────────────────

export const aggregateCreateSchema = z.object({
  network_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid network address"),
  prefix_length: z.number().int().min(0).max(32),
  description: z.string().max(500).optional().or(z.literal("")),
  rir_id: z.string().uuid("Invalid RIR ID").optional().nullable(),
});

export const aggregateUpdateSchema = z.object({
  description: z.string().max(500).optional().or(z.literal("")),
  rir_id: z.string().uuid().optional().nullable(),
});

// ── IP Ranges ──────────────────────────────────────────────────────────

export const ipRangeCreateSchema = z.object({
  subnet_id: z.string().uuid("Invalid subnet ID"),
  start_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid start address"),
  end_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid end address"),
  status: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const ipRangeUpdateSchema = z.object({
  start_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/).optional(),
  end_address: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/).optional(),
  status: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

// ── ASNs ───────────────────────────────────────────────────────────────

export const asnCreateSchema = z.object({
  asn: z
    .number()
    .int("ASN must be an integer")
    .min(1, "ASN must be at least 1")
    .max(4294967295, "ASN must be at most 4294967295"),
  description: z.string().max(500).optional().or(z.literal("")),
  rir_id: z.string().uuid().optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
});

export const asnUpdateSchema = z.object({
  description: z.string().max(500).optional().or(z.literal("")),
  rir_id: z.string().uuid().optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
});

// ── Tags ───────────────────────────────────────────────────────────────

export const tagCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

// ── Custom Fields ──────────────────────────────────────────────────────

export const customFieldCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  label: z.string().max(100).optional().or(z.literal("")),
  applies_to: z.enum(["subnet", "ip_address", "site"], {
    errorMap: () => ({ message: "Invalid entity type" }),
  }),
  field_type: z.enum(["text", "number", "boolean", "date"], {
    errorMap: () => ({ message: "Invalid field type" }),
  }),
  required: z.boolean().default(false),
  default_value: z.string().max(255).optional().or(z.literal("")),
  choices: z.array(z.string()).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  weight: z.number().int().min(0).max(9999).optional(),
});

export const customFieldUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  label: z.string().max(100).optional().or(z.literal("")),
  applies_to: z.enum(["subnet", "ip_address", "site"]).optional(),
  field_type: z.enum(["text", "number", "boolean", "date"]).optional(),
  required: z.boolean().optional(),
  default_value: z.string().max(255).optional().or(z.literal("")),
  choices: z.array(z.string()).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  weight: z.number().int().min(0).max(9999).optional(),
});

// ── Validation Rules ───────────────────────────────────────────────────

export const validationRuleCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  entity_type: z.enum(["subnet", "ip_address"], {
    errorMap: () => ({ message: "Invalid entity type" }),
  }),
  condition: z.record(z.string(), z.unknown()).optional().nullable(),
  error_message: z.string().min(1, "Error message is required").max(500),
  enabled: z.boolean().default(true),
  enforce_on_delete: z.boolean().default(false),
  weight: z.number().int().min(0).max(9999).optional(),
});

export const validationRuleUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  entity_type: z.enum(["subnet", "ip_address"]).optional(),
  condition: z.record(z.string(), z.unknown()).optional().nullable(),
  error_message: z.string().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
  enforce_on_delete: z.boolean().optional(),
  weight: z.number().int().min(0).max(9999).optional(),
});

// ── Webhooks ───────────────────────────────────────────────────────────

export const webhookCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.string().url("Invalid URL").refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  }),
  http_method: z.enum(["POST", "PUT", "PATCH", "GET"]).default("POST"),
  secret: z.string().max(255).optional().or(z.literal("")),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
  ssl_verify: z.boolean().default(true),
  timeout: z.number().int().min(1).max(60).default(5),
  retry_count: z.number().int().min(0).max(10).default(3),
});

export const webhookUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  http_method: z.enum(["POST", "PUT", "PATCH", "GET"]).optional(),
  secret: z.string().max(255).optional().or(z.literal("")),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  ssl_verify: z.boolean().optional(),
  timeout: z.number().int().min(1).max(60).optional(),
  retry_count: z.number().int().min(0).max(10).optional(),
});
