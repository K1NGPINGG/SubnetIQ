import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dark = useThemeStore((s) => s.dark);

  return (
    <div className={cn("rounded-lg border", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
        <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{title}</span>
      </button>
      {open && <div className={`border-t px-4 py-4 text-sm leading-relaxed ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700"}`}>{children}</div>}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  const dark = useThemeStore((s) => s.dark);
  return (
    <pre className={`mt-2 overflow-x-auto rounded-md px-3 py-2 text-xs font-mono ${dark ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-800"}`}>
      {children}
    </pre>
  );
}

function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const dark = useThemeStore((s) => s.dark);
  const methodColors: Record<string, string> = {
    GET: dark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-700",
    POST: dark ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-700",
    PUT: dark ? "bg-amber-900/40 text-amber-400" : "bg-amber-50 text-amber-700",
    DELETE: dark ? "bg-red-900/40 text-red-400" : "bg-red-50 text-red-700",
  };
  return (
    <div className="flex items-start gap-3 py-2">
      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold", methodColors[method] || "")}>{method}</span>
      <div>
        <code className={`text-xs font-mono ${dark ? "text-gray-300" : "text-gray-800"}`}>{path}</code>
        <p className={`mt-0.5 text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>{desc}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const dark = useThemeStore((s) => s.dark);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className={`text-xl font-bold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Help & Documentation</h1>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          Learn how to use SubnetIQ and integrate with the REST API.
        </p>
      </div>

      <Section title="Getting Started" defaultOpen>
        <div className="space-y-3">
          <p><strong>1. Create a Site</strong> &mdash; Go to Sites and add a physical location with coordinates for map visualization.</p>
          <p><strong>2. Add VLANs</strong> &mdash; Define your VLANs under the VLANs page, optionally linking them to sites.</p>
          <p><strong>3. Create Subnets</strong> &mdash; Add your IP subnets under Subnets. Assign them to sites and VLANs for organization.</p>
          <p><strong>4. Add IP Addresses</strong> &mdash; Manually add IPs or use Discovery to auto-scan a subnet.</p>
          <p><strong>5. Run Discovery</strong> &mdash; Navigate to Discovery, select a subnet and scan type (Ping, SNMP, ARP, or Full) to discover live hosts.</p>
          <p><strong>6. Monitor Dashboard</strong> &mdash; The Dashboard shows utilization metrics, charts, and the global site map.</p>
        </div>
      </Section>

      <Section title="Network Discovery">
        <div className="space-y-3">
          <p>SubnetIQ supports multiple discovery methods:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Ping (ICMP)</strong> &mdash; Fast sweep using system ping. Identifies alive hosts and response times.</li>
            <li><strong>ARP</strong> &mdash; Reads the ARP table to find MAC addresses of recently contacted hosts.</li>
            <li><strong>SNMP</strong> &mdash; Queries network devices using SNMP v1/v2c/v3 to get sysDescr, sysName, and interface MAC addresses.</li>
            <li><strong>Ping + SNMP</strong> &mdash; Combines ICMP ping with SNMP polling for maximum coverage.</li>
            <li><strong>Full</strong> &mdash; Runs Ping, ARP, DNS, and SNMP together.</li>
          </ul>
          <p>Scans can be scheduled to run recursively at custom intervals.</p>
        </div>
      </Section>

      <Section title="Asset Discovery (SNMP & WinRM)">
        <div className="space-y-3">
          <p>The Assets page provides hardware-level device discovery. Unlike network discovery (which finds live hosts), asset discovery collects detailed device information:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>SNMP Discovery</strong> &mdash; Ping-sweeps the subnet first, then queries only live hosts for sysDescr, sysName, sysObjectID, uptime, and interface details (MAC addresses, status). Stores results in the Assets inventory.</li>
            <li><strong>WinRM Discovery</strong> &mdash; Ping-sweeps first, then connects to live Windows hosts via WinRM to retrieve hardware details: manufacturer, model, serial number, OS, CPU cores, RAM, and network adapters.</li>
          </ul>
          <p>Both methods use a two-phase approach: concurrent ICMP ping sweep (80 hosts at a time) to identify live hosts, followed by protocol-specific queries. This is much faster and more accurate than probing every IP.</p>
          <p>Discovery scan status is tracked in the Discovery Scans list. Each scan shows progress from <code>running</code> to <code>completed</code> with detailed results (new assets found, updated, failed, offline).</p>
          <p><strong>How to use:</strong> Go to Assets &rarr; click &ldquo;Run Discovery&rdquo; &rarr; select scan type (SNMP or WinRM) &rarr; enter target IPs or select a subnet &rarr; choose credentials &rarr; click Run.</p>
        </div>
      </Section>

      <Section title="WinRM Profiles">
        <div className="space-y-3">
          <p>WinRM Profiles store Windows remote management credentials for asset discovery. Create a profile under Admin &rarr; WinRM Profiles.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Username / Password</strong> &mdash; Windows domain or local account credentials.</li>
            <li><strong>Port</strong> &mdash; Default is 5985 (HTTP) or 5986 (HTTPS).</li>
            <li><strong>Use SSL</strong> &mdash; Enable for HTTPS connections.</li>
          </ul>
          <p>When running WinRM discovery, select a saved profile to auto-fill credentials. The discovery agent connects via PowerShell Remoting and queries Win32_ComputerSystem, Win32_BIOS, and Win32_OperatingSystem via CIM/WMI.</p>
        </div>
      </Section>

      <Section title="API Authentication">
        <div className="space-y-3">
          <p>All API requests require a JWT Bearer token. Obtain one via the login endpoint:</p>
          <CodeBlock>{`POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "email": "...", "role": "admin" }
}`}</CodeBlock>
          <p>Include the token in all subsequent requests:</p>
          <CodeBlock>{`Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`}</CodeBlock>
        </div>
      </Section>

      <Section title="API Reference — Core Endpoints">
        <div className="space-y-1">
          <h4 className={`font-semibold text-xs mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>SUBNETS</h4>
          <ApiEndpoint method="GET" path="/api/v1/subnets/" desc="List all subnets with optional search, site, VLAN, and parent filters" />
          <ApiEndpoint method="POST" path="/api/v1/subnets/" desc="Create a new subnet (validates CIDR, checks overlaps)" />
          <ApiEndpoint method="GET" path="/api/v1/subnets/{id}" desc="Get subnet details by ID" />
          <ApiEndpoint method="PUT" path="/api/v1/subnets/{id}" desc="Update a subnet" />
          <ApiEndpoint method="DELETE" path="/api/v1/subnets/{id}" desc="Delete a subnet (must not have children)" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>IP ADDRESSES</h4>
          <ApiEndpoint method="GET" path="/api/v1/ips/" desc="List IPs with filters for subnet, status, search" />
          <ApiEndpoint method="POST" path="/api/v1/ips/" desc="Create or allocate an IP address" />
          <ApiEndpoint method="PUT" path="/api/v1/ips/{id}" desc="Update IP (hostname, status, MAC, device type, assigned_to)" />
          <ApiEndpoint method="DELETE" path="/api/v1/ips/{id}" desc="Release an IP address" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>SITES</h4>
          <ApiEndpoint method="GET" path="/api/v1/sites/" desc="List all sites" />
          <ApiEndpoint method="POST" path="/api/v1/sites/" desc="Create a site with optional lat/lng coordinates" />
          <ApiEndpoint method="PUT" path="/api/v1/sites/{id}" desc="Update a site" />
          <ApiEndpoint method="DELETE" path="/api/v1/sites/{id}" desc="Delete a site" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>VLANs</h4>
          <ApiEndpoint method="GET" path="/api/v1/vlans/" desc="List all VLANs" />
          <ApiEndpoint method="POST" path="/api/v1/vlans/" desc="Create a VLAN (1-4094)" />
          <ApiEndpoint method="PUT" path="/api/v1/vlans/{id}" desc="Update a VLAN" />
          <ApiEndpoint method="DELETE" path="/api/v1/vlans/{id}" desc="Delete a VLAN" />
        </div>
      </Section>

      <Section title="API Reference — Discovery & Reporting">
        <div className="space-y-1">
          <h4 className={`font-semibold text-xs mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>DISCOVERY</h4>
          <ApiEndpoint method="GET" path="/api/v1/discovery/" desc="List all scans" />
          <ApiEndpoint method="POST" path="/api/v1/discovery/" desc="Start a new scan (subnet_id, scan_type, snmp_credential_id)" />
          <ApiEndpoint method="GET" path="/api/v1/discovery/{id}" desc="Get scan status and results" />
          <ApiEndpoint method="GET" path="/api/v1/discovery/latest/{subnet_id}" desc="Get latest completed scan for a subnet" />
          <ApiEndpoint method="POST" path="/api/v1/discovery/{id}/cancel" desc="Cancel a running scan" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>REPORTS</h4>
          <ApiEndpoint method="GET" path="/api/v1/reports/dashboard" desc="Dashboard summary (total IPs, allocated, available, top subnets)" />
          <ApiEndpoint method="GET" path="/api/v1/reports/dashboard/map-data" desc="Site locations with subnet data for world map" />
          <ApiEndpoint method="GET" path="/api/v1/reports/subnet-utilization" desc="Utilization report with threshold flagging" />
          <ApiEndpoint method="GET" path="/api/v1/reports/ip-history/{address}" desc="Audit history for a specific IP" />
        </div>
      </Section>

      <Section title="API Reference — Admin">
        <div className="space-y-1">
          <h4 className={`font-semibold text-xs mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>USERS (Admin only)</h4>
          <ApiEndpoint method="GET" path="/api/v1/admin/users" desc="List all users in tenant" />
          <ApiEndpoint method="POST" path="/api/v1/admin/users" desc="Create user (email, password, role, display_name)" />
          <ApiEndpoint method="PUT" path="/api/v1/admin/users/{id}" desc="Update user (including optional password reset)" />
          <ApiEndpoint method="DELETE" path="/api/v1/admin/users/{id}" desc="Delete a user" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>SNMP CREDENTIALS</h4>
          <ApiEndpoint method="GET" path="/api/v1/snmp-credentials/" desc="List SNMP profiles" />
          <ApiEndpoint method="POST" path="/api/v1/snmp-credentials/" desc="Create SNMP credential (v1/v2c/v3)" />
          <ApiEndpoint method="PUT" path="/api/v1/snmp-credentials/{id}" desc="Update SNMP credential" />
          <ApiEndpoint method="DELETE" path="/api/v1/snmp-credentials/{id}" desc="Delete SNMP credential" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>WINRM CREDENTIALS</h4>
          <ApiEndpoint method="GET" path="/api/v1/winrm-credentials/" desc="List WinRM profiles" />
          <ApiEndpoint method="POST" path="/api/v1/winrm-credentials/" desc="Create WinRM credential (username, password, port, use_ssl)" />
          <ApiEndpoint method="PUT" path="/api/v1/winrm-credentials/{id}" desc="Update WinRM credential" />
          <ApiEndpoint method="DELETE" path="/api/v1/winrm-credentials/{id}" desc="Delete WinRM credential" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>ASSETS</h4>
          <ApiEndpoint method="GET" path="/api/v1/assets/" desc="List discovered assets with filters (search, discovery_source, device_type, status)" />
          <ApiEndpoint method="GET" path="/api/v1/assets/{id}" desc="Get asset details including network interfaces and raw scan data" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>ASSET DISCOVERY</h4>
          <ApiEndpoint method="POST" path="/api/v1/discovery/run" desc="Run SNMP or WinRM asset discovery against target IPs or a subnet" />
        </div>
      </Section>

      <Section title="Scan Types Reference">
        <div className="space-y-2">
          <div className={`rounded-md p-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
            <code className="text-xs font-bold">ping</code>
            <p className="mt-1 text-xs">ICMP echo request with 1s timeout. Fast, identifies alive hosts and latency.</p>
          </div>
          <div className={`rounded-md p-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
            <code className="text-xs font-bold">arp</code>
            <p className="mt-1 text-xs">Reads /proc/net/arp for MAC addresses of recently contacted hosts.</p>
          </div>
          <div className={`rounded-md p-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
            <code className="text-xs font-bold">snmp</code>
            <p className="mt-1 text-xs">Queries sysDescr, sysName, and ifPhysAddress. Requires SNMP credentials. 1.5s timeout per host.</p>
          </div>
          <div className={`rounded-md p-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
            <code className="text-xs font-bold">icmp_and_snmp</code>
            <p className="mt-1 text-xs">ICMP ping + SNMP queries + ARP + DNS. Best balance of speed and detail.</p>
          </div>
          <div className={`rounded-md p-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
            <code className="text-xs font-bold">full</code>
            <p className="mt-1 text-xs">All methods: Ping, ARP, DNS, and SNMP. Slowest but most comprehensive.</p>
          </div>
        </div>
      </Section>

      <Section title="Example: Create a Subnet via API">
        <CodeBlock>{`curl -X POST http://your-server:3000/api/v1/subnets/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "network_address": "192.168.10.0",
    "prefix_length": 24,
    "name": "Office LAN",
    "description": "Main office network",
    "gateway": "192.168.10.1",
    "dns_servers": "8.8.8.8, 8.8.4.4"
  }'`}</CodeBlock>
      </Section>

      <Section title="Example: Run a Discovery Scan">
        <CodeBlock>{`# Start a ping+SNMP scan
curl -X POST http://your-server:3000/api/v1/discovery/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "subnet_id": "uuid-of-subnet",
    "scan_type": "icmp_and_snmp",
    "snmp_credential_id": "uuid-of-credential"
  }'

# Poll for results
curl http://your-server:3000/api/v1/discovery/SCAN_ID \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</CodeBlock>
      </Section>

      <Section title="Example: Run SNMP Asset Discovery">
        <CodeBlock>{`# SNMP asset discovery on specific IPs
curl -X POST http://your-server:3000/api/v1/discovery/run \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_type": "SNMP",
    "target_ips": ["10.0.0.1", "10.0.0.2", "10.0.0.254"],
    "snmp_community": "public"
  }'

# Or discover via a subnet
curl -X POST http://your-server:3000/api/v1/discovery/run \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_type": "SNMP",
    "subnet_id": "uuid-of-subnet",
    "snmp_credential_id": "uuid-of-credential"
  }'

# WinRM asset discovery (requires credentials)
curl -X POST http://your-server:3000/api/v1/discovery/run \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_type": "WINRM",
    "target_ips": ["10.0.0.100"],
    "winrm_credential_id": "uuid-of-winrm-credential"
  }'`}</CodeBlock>
      </Section>
    </div>
  );
}
