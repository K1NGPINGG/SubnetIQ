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

      <Section title="What's New" defaultOpen>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">v1.3.0</h4>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li><strong>Backup &amp; Restore</strong> &mdash; Full database backups via native PostgreSQL dump/restore, downloadable archives, a restore wizard, and automated daily backups with retention (Administration &rarr; Backups).</li>
              <li><strong>Dashboard map</strong> &mdash; Site markers open on click with scrollable popups, smoother zoom with no white gaps, and themed popups.</li>
              <li><strong>Recent Activity feed</strong> &mdash; A live audit feed on the dashboard, plus a utilization progress bar on the Allocated KPI card.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">v1.2.0</h4>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li><strong>Virtual IP (VIP) inventory</strong> &mdash; Mark IPs as VIPs, set their mechanism type, and link them to backing node IPs with roles. Includes a dedicated Virtual IPs page, VIP badges/filters, and editable VIP records.</li>
              <li><strong>Update tracking</strong> &mdash; A live progress bar while the stack updates, a manual &ldquo;Check for updates&rdquo; button, and automatic reload once an update completes.</li>
              <li><strong>Resizable dashboard map</strong> &mdash; Drag the map handle to resize it, with scrollable site tooltips.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">v1.0.3</h4>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li><strong>IPAM Records</strong> &mdash; A unified, searchable view of every IP across all subnets with per-record editing, bulk editing, and CSV/PDF export.</li>
              <li><strong>Live scan status</strong> &mdash; Discovery scan progress now updates automatically while a scan runs &mdash; no manual refresh needed.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">v1.0.2</h4>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li><strong>Admin updates</strong> &mdash; Check for new SubnetIQ releases and update the stack from the Admin area.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">v1.0.0</h4>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li><strong>Address hierarchy</strong> &mdash; VRFs, RIRs, Aggregates, IP Ranges, and ASNs for structured IPAM.</li>
              <li><strong>Metadata</strong> &mdash; Tags, Custom Fields, and Validation Rules on subnets, IPs, and sites.</li>
              <li><strong>Approval workflow</strong> &mdash; Request/approve/reject IP releases for privileged control.</li>
              <li><strong>Webhooks</strong> &mdash; Notify external systems on IP create/update/delete.</li>
              <li><strong>Global search</strong> &mdash; One box to find subnets, IPs, sites, and assets.</li>
              <li><strong>System logs</strong> &mdash; Backend application logs with level/category/source filters.</li>
              <li><strong>Multi-factor authentication</strong> &mdash; Optional TOTP MFA for user accounts.</li>
              <li><strong>Bulk IP creation</strong> &mdash; Create many IPs in one request from the IPs page.</li>
              <li><strong>Scan run-now</strong> &mdash; Trigger any scheduled scan immediately.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Getting Started" defaultOpen>
        <div className="space-y-3">
          <p><strong>1. Create a Site</strong> &mdash; Go to Sites and add a physical location with coordinates for map visualization.</p>
          <p><strong>2. Add VLANs</strong> &mdash; Define your VLANs under the VLANs page, optionally linking them to sites.</p>
          <p><strong>3. Create Subnets</strong> &mdash; Add your IP subnets under Subnets. Assign them to sites and VLANs for organization.</p>
          <p><strong>4. Add IP Addresses</strong> &mdash; Manually add IPs or use Discovery to auto-scan a subnet.</p>
          <p><strong>5. Use IPAM Records</strong> &mdash; The IPAM Records page gives you a single searchable, filterable view of every IP across all subnets &mdash; edit records, bulk-edit selections, and export to CSV or PDF.</p>
          <p><strong>6. Run Discovery</strong> &mdash; Navigate to Discovery, select a subnet and scan type (Ping, SNMP, ARP, or Full) to discover live hosts.</p>
          <p><strong>7. Monitor Dashboard</strong> &mdash; The Dashboard shows utilization metrics, charts, and the global site map.</p>
          <p><strong>8. Model your hierarchy</strong> &mdash; Use VRFs, RIRs, Aggregates, IP Ranges, and ASNs to structure address space at scale.</p>
          <p><strong>9. Enrich with metadata</strong> &mdash; Apply Tags and Custom Fields to subnets, IPs, and sites; enforce Validation Rules on IP creation.</p>
        </div>
      </Section>

      <Section title="IPAM Records">
        <div className="space-y-3">
          <p>The <strong>IPAM Records</strong> page is a cross-subnet view of every IP in the system, built for day-to-day IPAM work.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>View &amp; filter</strong> &mdash; Search by address, hostname, MAC, or device type, and filter by status. Each row shows the IP, subnet CIDR, VRF, hostname, MAC, device type, assigned-to, color-coded status, tags, and custom fields.</li>
            <li><strong>Edit a record</strong> &mdash; Click Edit to update status, hostname, device type, MAC, assigned-to, subnet/VRF assignment, description, tags, and custom fields. The IP address itself is read-only (release and re-allocate to change it).</li>
            <li><strong>Bulk edit</strong> &mdash; Select records with the checkboxes and apply a new status, device type, or assigned-to to all of them at once. Manage tags across the selection with <strong>Add</strong>, <strong>Replace</strong>, or <strong>Remove</strong> modes.</li>
            <li><strong>Export</strong> &mdash; Download the current view as <strong>CSV</strong> (for Excel/Numbers) or a formatted <strong>PDF</strong> report.</li>
          </ul>
          <p>Backed by <code>GET /api/v1/ips/records</code>.</p>
        </div>
      </Section>

      <Section title="Virtual IPs (VIPs)">
        <div className="space-y-3">
          <p>SubnetIQ can track <strong>Virtual IP (VIP) inventory</strong>: IP addresses that float between
          multiple physical/virtual hosts (Keepalived, CARP/VRRP, load balancers, Kubernetes, or cloud floating IPs).</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>On the <strong>IPs</strong> page, mark an address as a <strong>VIP</strong> and pick its mechanism type (<code>keepalived</code>, <code>carp_vrrp</code>, <code>load_balancer</code>, <code>kubernetes</code>, <code>floating_cloud</code>).</li>
            <li>Assign <strong>backing node IPs</strong> to the VIP, each with a role (<code>primary</code>, <code>backup</code>, <code>active</code>, <code>standby</code>).</li>
            <li>VIPs show a <strong>badge</strong> in the IP table along with their type and bound nodes; use the <strong>All IPs / Static IPs / VIPs Only</strong> filter to view them.</li>
            <li>Demoting a VIP (unchecking the toggle) clears its type and node bindings automatically.</li>
            <li>Discovery scans report which detected hosts are VIPs, but never modify their node bindings.</li>
          </ul>
        </div>
      </Section>

      <Section title="Address Hierarchy (VRFs, RIRs, Aggregates, ASNs)">
        <div className="space-y-3">
          <p>SubnetIQ lets you model real-world IPAM hierarchy for large environments:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>VRFs</strong> &mdash; Virtual Routing and Forwarding instances. Each VRF is an isolated routing/address space; subnets can be assigned to a VRF (with per-VRF uniqueness checks).</li>
            <li><strong>RIRs</strong> &mdash; Regional Internet Registries (ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC). Track which registry your allocations come from.</li>
            <li><strong>Aggregates</strong> &mdash; Large blocks of address space allocated to your organization (e.g. a /16). Child subnets can be grouped under an aggregate, with live usage reporting per aggregate.</li>
            <li><strong>IP Ranges</strong> &mdash; Named contiguous ranges (e.g. a DHCP pool or a reservation block) that can be associated with a subnet.</li>
            <li><strong>ASNs</strong> &mdash; Autonomous System Numbers. Register your AS numbers (16-bit or 32-bit) for use in BGP / network documentation.</li>
          </ul>
        </div>
      </Section>

      <Section title="Tags, Custom Fields & Validation Rules">
        <div className="space-y-3">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Tags</strong> &mdash; Create reusable tags (e.g. <code>dmz</code>, <code>production</code>, <code>legacy</code>) with a color and optional description. Tags can be applied to subnets, IP addresses, and sites to filter and organize resources.</li>
            <li><strong>Custom Fields</strong> &mdash; Define extra attributes (string, integer, boolean, date) attached to subnets, IPs, or sites. Perfect for tracking owners, cost centers, or compliance data. Each field declares a target entity type.</li>
            <li><strong>Validation Rules</strong> &mdash; Enforce policy at IP creation time. Rules can restrict IPs to RFC1918 private ranges or force subnets into a declared allocation. IPs or subnets that violate a rule are rejected with a clear error.</li>
          </ul>
        </div>
      </Section>

      <Section title="Approvals & Audit">
        <div className="space-y-3">
          <p><strong>Approval Workflow</strong> &mdash; Sensitive IP lifecycle changes require a privileged user to approve them:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>An operator requests a <strong>release</strong> of an allocated/reserved IP (or a forced re-allocation).</li>
            <li>The request appears in the pending approval queue with requester, reason, and timestamp.</li>
            <li>An administrator with the <code>ip_address.approve</code> permission either <strong>approves</strong> (executing the change) or <strong>rejects</strong> it, optionally leaving notes.</li>
            <li>Duplicate pending requests for the same IP are prevented.</li>
          </ul>
          <p><strong>Audit & System Logs</strong> &mdash; Every sensitive action is recorded in the audit log (who, what, when, and the before/after values). The System Logs page surfaces backend application logs (INFO/WARNING/ERROR) with filters for level, category, and source. Both are viewable from the Audit section.</p>
        </div>
      </Section>

      <Section title="Webhooks">
        <div className="space-y-3">
          <p>SubnetIQ can notify external systems about IPAM events via webhooks:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Create webhook endpoints (URL + optional secret) that are fired when IPs are created, updated, or deleted.</li>
            <li>Each webhook can subscribe to specific <strong>events</strong> and choose whether the delivery is <strong>synchronous</strong> or <strong>asynchronous</strong>.</li>
            <li>Payloads include the event type, the affected resource, and a timestamp, signed with the configured secret when set.</li>
            <li>Enable or disable webhooks without deleting them.</li>
          </ul>
          <p><strong>Note:</strong> failed async webhook deliveries are logged to the system log for troubleshooting.</p>
        </div>
      </Section>

      <Section title="Backup & Restore">
        <div className="space-y-3">
          <p>SubnetIQ includes built-in <strong>disaster recovery</strong> for the database (Administration &rarr; Backups):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Create a backup</strong> &mdash; &ldquo;Create Backup Now&rdquo; runs a native <code>pg_dump</code> in the background and bundles the dump plus a manifest (schema/app versions) into a timestamped <code>.tar.gz</code> archive.</li>
            <li><strong>Download / delete</strong> &mdash; stored backups are listed with size, creation time, and a manual/automated tag; download or delete them from the table.</li>
            <li><strong>Restore</strong> &mdash; upload a <code>.tar.gz</code> backup; SubnetIQ validates schema/app compatibility, terminates active connections, and restores with <code>pg_restore --clean</code>. Restoring is destructive &mdash; you must type <strong>CONFIRM</strong> to proceed.</li>
            <li><strong>Automated backups</strong> &mdash; a scheduled task creates a backup daily at midnight and enforces a 7-day retention policy.</li>
          </ul>
        </div>
      </Section>

      <Section title="Global Search">
        <div className="space-y-3">
          <p>The global search box (top navigation) lets you find anything quickly:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Search <strong>subnets</strong> by network/name, <strong>IPs</strong> by address/hostname/MAC, <strong>sites</strong> by name/city, and <strong>assets</strong> by hostname/device type.</li>
            <li>Results are grouped by entity type with links to jump straight to the detail page.</li>
            <li>Backed by <code>GET /api/v1/search?q=&lt;term&gt;</code>.</li>
          </ul>
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
          <p>Scans can be scheduled to run recursively at custom intervals. Scan status updates automatically while a scan is running, so you always see live progress without refreshing the page.</p>
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
          <p className="mt-3"><strong>Multi-factor authentication (MFA)</strong> &mdash; Users can enable TOTP-based MFA from their profile. Set up a one-time secret with any authenticator app, verify a code to enable it, and provide a code on login when enabled:</p>
          <CodeBlock>{`POST /api/v1/auth/mfa/setup      # Get TOTP secret
POST /api/v1/auth/mfa/verify    # Verify code & enable MFA
POST /api/v1/auth/mfa/disable   # Disable MFA
POST /api/v1/auth/login         # Include "mfa_code" when enabled`}</CodeBlock>
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
          <ApiEndpoint method="GET" path="/api/v1/ips/records" desc="List all IP records across subnets (enriched with subnet CIDR and VRF name)" />
          <ApiEndpoint method="POST" path="/api/v1/ips/" desc="Create or allocate an IP address" />
          <ApiEndpoint method="POST" path="/api/v1/ips/allocate" desc="Allocate the next free IP in a subnet" />
          <ApiEndpoint method="POST" path="/api/v1/ips/bulk" desc="Bulk-create many IPs at once" />
          <ApiEndpoint method="GET" path="/api/v1/ips/by-address/{address}" desc="Find an IP by its address" />
          <ApiEndpoint method="GET" path="/api/v1/ips/usage/{subnet_id}" desc="Get IP usage stats for a subnet" />
          <ApiEndpoint method="PUT" path="/api/v1/ips/{id}" desc="Update IP (hostname, status, MAC, device type, assigned_to, VIP type/node bindings)" />
          <ApiEndpoint method="DELETE" path="/api/v1/ips/{id}" desc="Release an IP address" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>VRFs, RIRs, AGGREGATES, ASNs</h4>
          <ApiEndpoint method="GET" path="/api/v1/vrfs/" desc="List all VRFs" />
          <ApiEndpoint method="POST" path="/api/v1/vrfs/" desc="Create a VRF (isolated routing space)" />
          <ApiEndpoint method="GET" path="/api/v1/rirs/" desc="List all RIRs" />
          <ApiEndpoint method="POST" path="/api/v1/rirs/" desc="Create an RIR (ARIN, RIPE, APNIC, ...)" />
          <ApiEndpoint method="GET" path="/api/v1/aggregates/" desc="List aggregates" />
          <ApiEndpoint method="POST" path="/api/v1/aggregates/" desc="Create an aggregate block" />
          <ApiEndpoint method="GET" path="/api/v1/aggregates/{id}/usage" desc="Usage report for an aggregate" />
          <ApiEndpoint method="GET" path="/api/v1/ip-ranges/" desc="List named IP ranges" />
          <ApiEndpoint method="POST" path="/api/v1/ip-ranges/" desc="Create an IP range" />
          <ApiEndpoint method="GET" path="/api/v1/asns/" desc="List AS numbers" />
          <ApiEndpoint method="POST" path="/api/v1/asns/" desc="Register an ASN (16-bit or 32-bit)" />

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

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>TAGS, CUSTOM FIELDS & VALIDATION</h4>
          <ApiEndpoint method="GET" path="/api/v1/tags/" desc="List all tags" />
          <ApiEndpoint method="POST" path="/api/v1/tags/" desc="Create a tag (name, color, description)" />
          <ApiEndpoint method="GET" path="/api/v1/custom-fields/" desc="List custom field definitions" />
          <ApiEndpoint method="POST" path="/api/v1/custom-fields/" desc="Define a custom field (entity, type)" />
          <ApiEndpoint method="GET" path="/api/v1/validation-rules/" desc="List validation rules" />
          <ApiEndpoint method="POST" path="/api/v1/validation-rules/" desc="Add a validation rule (e.g. RFC1918-only)" />
        </div>
      </Section>

      <Section title="API Reference — Discovery & Reporting">
        <div className="space-y-1">
          <h4 className={`font-semibold text-xs mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>DISCOVERY</h4>
          <ApiEndpoint method="GET" path="/api/v1/discovery/" desc="List all scans" />
          <ApiEndpoint method="POST" path="/api/v1/discovery/" desc="Start a new scan (subnet_id, scan_type, snmp_credential_id)" />
          <ApiEndpoint method="GET" path="/api/v1/discovery/{id}" desc="Get scan status and results" />
          <ApiEndpoint method="GET" path="/api/v1/discovery/latest/{subnet_id}" desc="Get latest completed scan for a subnet" />
          <ApiEndpoint method="POST" path="/api/v1/discovery/{id}/run-now" desc="Manually trigger a scheduled scan" />
          <ApiEndpoint method="POST" path="/api/v1/discovery/{id}/cancel" desc="Cancel a running scan" />
          <ApiEndpoint method="DELETE" path="/api/v1/discovery/{id}" desc="Delete a scan (must not be running)" />

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

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>APPROVALS</h4>
          <ApiEndpoint method="GET" path="/api/v1/approvals/" desc="List approval requests (filter by status/type)" />
          <ApiEndpoint method="POST" path="/api/v1/approvals/ip/{ip_id}/release" desc="Request approval to release an allocated IP" />
          <ApiEndpoint method="POST" path="/api/v1/approvals/{approval_id}/approve" desc="Approve a pending request (executes the change)" />
          <ApiEndpoint method="POST" path="/api/v1/approvals/{approval_id}/reject" desc="Reject a pending request (IP untouched)" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>WEBHOOKS</h4>
          <ApiEndpoint method="GET" path="/api/v1/webhooks/" desc="List webhook endpoints" />
          <ApiEndpoint method="POST" path="/api/v1/webhooks/" desc="Create a webhook (url, events, sync/async)" />
          <ApiEndpoint method="PUT" path="/api/v1/webhooks/{id}" desc="Update a webhook" />
          <ApiEndpoint method="DELETE" path="/api/v1/webhooks/{id}" desc="Delete a webhook" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>SEARCH & LOGS</h4>
          <ApiEndpoint method="GET" path="/api/v1/search?q=term" desc="Global search across subnets, IPs, sites, assets" />
          <ApiEndpoint method="GET" path="/api/v1/logs/" desc="System logs with level/category/source filters" />
          <ApiEndpoint method="GET" path="/api/v1/audit/" desc="Audit trail with entity-type and action filters" />

          <h4 className={`font-semibold text-xs mt-4 mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>BACKUPS (admin)</h4>
          <ApiEndpoint method="POST" path="/api/v1/system/backups/create" desc="Trigger a background full database backup (Celery pg_dump)" />
          <ApiEndpoint method="GET" path="/api/v1/system/backups" desc="List stored backup archives" />
          <ApiEndpoint method="GET" path="/api/v1/system/backups/{filename}/download" desc="Download a backup archive" />
          <ApiEndpoint method="DELETE" path="/api/v1/system/backups/{filename}" desc="Delete a stored backup" />
          <ApiEndpoint method="POST" path="/api/v1/system/backups/restore" desc="Upload and restore a backup (destructive)" />
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
