# SubnetIQ — Onboarding Guide

A step-by-step guide to getting productive with SubnetIQ, the IP Address Management (IPAM)
platform. It walks you through every feature from first login to day-to-day operations.

---

## Table of Contents

1. [Your First Login](#1-your-first-login)
2. [A Tour of the Interface](#2-a-tour-of-the-interface)
3. [Step 1 — Create a Site](#3-step-1--create-a-site)
4. [Step 2 — Add VLANs](#4-step-2--add-vlans)
5. [Step 3 — Model Your Address Hierarchy](#5-step-3--model-your-address-hierarchy)
6. [Step 4 — Create Subnets](#6-step-4--create-subnets)
7. [Step 5 — Add IP Addresses](#7-step-5--add-ip-addresses)
8. [Step 6 — Use the IPAM Records Page](#8-step-6--use-the-ipam-records-page)
9. [Step 7 — Enrich with Tags & Custom Fields](#9-step-7--enrich-with-tags--custom-fields)
10. [Step 8 — Run Network Discovery](#10-step-8--run-network-discovery)
11. [Step 9 — Asset Discovery (SNMP & WinRM)](#11-step-9--asset-discovery-snmp--winrm)
12. [Step 10 — Approvals & Audit](#12-step-10--approvals--audit)
13. [Step 11 — Webhooks](#13-step-11--webhooks)
14. [Step 12 — Global Search & Reports](#14-step-12--global-search--reports)
15. [Step 13 — Administration](#15-step-13--administration)
16. [Working with the REST API](#working-with-the-rest-api)
17. [Self-Hosting](#self-hosting)
18. [Troubleshooting](#troubleshooting)

---

## 1. Your First Login

Open SubnetIQ in your browser and sign in with the credentials your administrator gave you.

- **Email address** — your login identifier.
- **Password** — your account password.

After the first boot the platform automatically creates a **superadmin** account from the
server's environment variables (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`).

> **Important:** If you log in with the default superadmin credentials, change the password
> immediately from your profile.

### Enable MFA (optional but recommended)

Multi-factor authentication adds a TOTP one-time code on top of your password:

1. Open your profile page and start **MFA setup**.
2. Scan the one-time secret with any authenticator app (Google Authenticator, Authy, 1Password, ...).
3. Verify a generated code to enable it.
4. From then on, every login asks for the current code alongside your password.

MFA can be disabled again from the same profile page.

---

## 2. A Tour of the Interface

The sidebar on the left is your main navigation. The key pages are:

| Page | What it does |
|------|--------------|
| **Dashboard** | Live overview: total / allocated / available IPs, utilization charts, alerts, and the global site map. |
| **Sites** | Physical locations. Each site can carry latitude/longitude for the map. |
| **VLANs** | Layer-2 segments, optionally linked to sites. |
| **Subnets** | Your IP networks with hierarchy, site/VLAN/VRF assignment, and per-subnet usage. |
| **IPAM Records** | Every IP across all subnets in one searchable, filterable list with edit, bulk edit, and export. |
| **IPs** | Add, allocate, and manage IP addresses within a chosen subnet. |
| **Address Hierarchy** | VRFs, RIRs, Aggregates, IP Ranges, and ASNs. |
| **Discovery** | Network scans (ping, ARP, SNMP, full) with scheduling. |
| **Assets** | Hardware inventory discovered via SNMP / WinRM. |
| **Approvals** | Pending requests for sensitive IP lifecycle changes. |
| **Webhooks** | Outbound notifications on IP events. |
| **Audit** | Audit trail plus system/application logs. |
| **Admin** | Users, SNMP credentials, WinRM profiles, and software updates. |
| **Help & Documentation** | In-app reference for all features and the REST API. |

Use the **global search box** in the top navigation to jump anywhere, and toggle
**dark mode** from the theme switch.

---

## 3. Step 1 — Create a Site

Go to **Sites** and click **Add Site**:

- Give it a **name** (e.g. "HQ", "London Office").
- Optionally add a **description**.
- Enter **latitude** and **longitude** to pin it on the map.

Sites are the top-level container for organizing your network by physical location.

---

## 4. Step 2 — Add VLANs

Go to **VLANs** and create the Layer-2 segments you use:

- **VLAN ID** — a number between 1 and 4094.
- **Name** — e.g. "Management", "Users".
- Optionally link the VLAN to a **site**.
- Optional **description**.

VLANs can be referenced when you create subnets, keeping everything organized by segment.

---

## 5. Step 3 — Model Your Address Hierarchy

For large environments, structure your address space before creating subnets:

- **VRFs** (Virtual Routing and Forwarding) — isolated routing/address spaces. Subnets can be
  assigned to a VRF, with uniqueness checks per VRF.
- **RIRs** — Regional Internet Registries (ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC). Track where
  your allocations come from.
- **Aggregates** — large blocks you own (e.g. a `/16`). Group child subnets under an aggregate
  and get live per-aggregate usage reporting.
- **IP Ranges** — named contiguous ranges (DHCP pools, reservation blocks) linked to a subnet.
- **ASNs** — Autonomous System Numbers (16-bit or 32-bit) for BGP documentation.

You don't have to use these for a small lab — but modelling them up front makes a big
environment much easier to reason about later.

---

## 6. Step 4 — Create Subnets

Go to **Subnets** and click **Add Subnet**:

- **Network address** — e.g. `192.168.10.0`.
- **Prefix length** — e.g. `24`.
- **Name** — e.g. "Office LAN".
- **Description**, **gateway**, and **DNS servers** (comma-separated).
- Assign it to a **site**, **VLAN**, and optionally a **VRF**.

SubnetIQ validates the CIDR and rejects subnets that overlap an existing network. Subnets can
be nested (parent/child) to mirror real-world routing.

The Subnet detail page shows live **usage**: how many addresses are available, allocated,
reserved, and the utilization percentage.

---

## 7. Step 5 — Add IP Addresses

Open the **IPs** page and pick a subnet. You can add addresses several ways:

- **Manually** — enter the address, status, hostname, MAC, device type, and who it's assigned to.
- **Allocate next free** — let SubnetIQ pick the next available address in the subnet.
- **Bulk create** — create many addresses at once (great for filling a new block).

Typical **statuses**: available, allocated, reserved, and others your organization defines.
Every IP carries optional metadata: hostname, MAC address, device type, assignee, description,
tags, and custom fields.

### Virtual IPs (VIPs)

To track a **Virtual IP** (an address that floats between hosts via Keepalived, CARP/VRRP,
a load balancer, Kubernetes, or a cloud floating IP):

1. In the IP create/edit dialog, tick **Virtual IP (VIP)**.
2. Pick the **VIP type** (keepalived, carp_vrrp, load_balancer, kubernetes, floating_cloud).
3. **Add backing node IPs** and assign each a role (`primary`, `backup`, `active`, `standby`).

VIPs are shown with a purple **VIP** badge in the IP table, along with their type and bound
nodes. Use the **All IPs / Static IPs / VIPs Only** filter in the toolbar to view just VIPs.
Unticking the VIP toggle (demoting) clears the type and node bindings automatically.

---

## 8. Step 6 — Use the IPAM Records Page

The **IPAM Records** page is a cross-subnet view of every IP in the system, built for
day-to-day IPAM work.

### Viewing & filtering

- **Search** — find records by address, hostname, MAC, or device type.
- **Status filter** — show only available, allocated, reserved, etc.
- Each row shows the **IP**, **subnet CIDR**, **VRF**, **hostname**, **MAC**, **device type**,
  **assigned-to**, **status** (color-coded tag), and any **tags / custom fields**.

### Editing a single record

Click **Edit** on a row to open the edit dialog:

- Update **status**, **hostname**, **device type**, **MAC**, **assigned-to**.
- Change the **subnet** or **VRF** assignment.
- Edit the **description**.
- Add or remove **tags** with the tag picker.
- Edit **custom fields** — editors adapt to the field type (text, number, boolean, date, select).
- The **IP address itself is read-only**; to change it, release and re-allocate.

### Bulk editing

Select records with the checkboxes, then click **Bulk Edit**:

- Apply a new **status**, **device type**, or **assigned-to** to all selected records at once.
- Manage **tags** across the selection with three modes:
  - **Add** — append the chosen tags.
  - **Replace** — replace all existing tags with the chosen set.
  - **Remove** — strip the chosen tags from every selected record.

### Exporting

- **Export CSV** — download the current filtered view as a comma-separated file for Excel/Numbers.
- **Export PDF** — download a formatted PDF report of the current view.

---

## 9. Step 7 — Enrich with Tags & Custom Fields

### Tags

Create reusable, color-coded tags (e.g. `dmz`, `production`, `legacy`) under the Tags section.
Apply them to **subnets**, **IPs**, and **sites** to filter and organize resources. On the
IPAM Records page, tags also feed the add/replace/remove bulk-edit modes.

### Custom Fields

Define extra attributes attached to subnets, IPs, or sites. Each field targets one entity type
and one of these types:

- **String** / **Integer** / **Boolean** / **Date** / **Select**

Perfect for tracking owners, cost centers, or compliance data.

### Validation Rules

Enforce policy at IP creation time — e.g. restrict IPs to RFC1918 private ranges or force
subnets into a declared allocation. Violations are rejected with a clear error.

---

## 10. Step 8 — Run Network Discovery

Go to **Discovery**, pick a subnet, and choose a scan type:

| Scan type | What it does |
|-----------|--------------|
| **Ping (ICMP)** | Fast sweep; identifies alive hosts and response times. |
| **ARP** | Reads the ARP table for MAC addresses of recently contacted hosts. |
| **SNMP** | Queries network devices for sysDescr, sysName, and interface MACs (needs credentials). |
| **Ping + SNMP** | ICMP + SNMP + ARP + DNS. Best balance of speed and detail. |
| **Full** | Ping, ARP, DNS, and SNMP together. Slowest but most comprehensive. |

Workflow:

1. Create **SNMP credentials** under Admin (v1/v2c/v3) if you plan SNMP scans.
2. Click **Run Discovery**, choose the scan type, and submit.
3. Watch the **scan status** on the Discovery Scans list — it updates automatically
   every few seconds while the scan is running (no manual refresh needed).
4. Scans can be **scheduled** to re-run recursively on an interval. Use **Run Now** to
   trigger a scheduled scan immediately, or **Cancel** to stop a running scan.

---

## 11. Step 9 — Asset Discovery (SNMP & WinRM)

The **Assets** page collects detailed hardware inventory. Unlike network discovery (which just
finds live hosts), asset discovery gathers device information.

Both methods are **two-phase**: a concurrent ICMP ping sweep (80 hosts at a time) first finds
live hosts, then only those hosts are queried in depth.

### SNMP Discovery

- Ping-sweeps the target, then queries live hosts for sysDescr, sysName, sysObjectID, uptime,
  and interface details (MAC, status). Results are stored in the Assets inventory.

### WinRM Discovery

- Ping-sweeps first, then connects to live Windows hosts over WinRM to read the manufacturer,
  model, serial number, OS, CPU cores, RAM, and network adapters.

### WinRM Profiles

Create a profile under **Admin → WinRM Profiles**:

- **Username / Password** — Windows domain or local account.
- **Port** — 5985 (HTTP) or 5986 (HTTPS).
- **Use SSL** — enable for HTTPS.

Then run discovery via **Assets → Run Discovery**, pick SNMP or WinRM, enter target IPs or a
subnet, choose credentials, and click **Run**. Results are summarized as new assets found,
updated, failed, and offline.

---

## 12. Step 10 — Approvals & Audit

### Approval Workflow

Sensitive IP lifecycle changes require approval from a privileged user:

1. An operator **requests a release** of an allocated/reserved IP (or a forced re-allocation).
2. The request appears in the **pending approval queue** with requester, reason, and timestamp.
3. An administrator with the `ip_address.approve` permission **approves** (executing the change)
   or **rejects** it, optionally leaving notes.
4. Duplicate pending requests for the same IP are prevented.

### Audit & System Logs

- The **Audit Log** records every sensitive action: who, what, when, and before/after values.
- The **System Logs** page surfaces backend application logs (INFO/WARNING/ERROR) with filters
  for level, category, and source.

---

## 13. Step 11 — Webhooks

Notify external systems about IPAM events:

1. Go to **Webhooks** and create an endpoint (**URL** + optional **secret**).
2. Subscribe it to specific **events** (IP created, updated, deleted).
3. Choose **synchronous** or **asynchronous** delivery.
4. Payloads include the event type, the affected resource, and a timestamp, signed with the
   secret when set.
5. Webhooks can be **enabled / disabled** without deleting them.

> Failed async deliveries are written to the system log for troubleshooting.

---

## 14. Step 12 — Global Search & Reports

### Global search

The search box in the top navigation finds **subnets** (network/name), **IPs** (address,
hostname, MAC), **sites** (name/city), and **assets** (hostname/device type). Results are
grouped by type with links straight to the detail page.

### Dashboard & reports

- The **Dashboard** summarizes total/allocated/available IPs, top subnets, utilization charts,
  alerts, and the **world map** of your sites.
- **Subnet utilization** reports flag subnets near or over your thresholds.
- **IP history** shows the audit trail for a specific address.

---

## 15. Step 13 — Administration

### Users

Under **Admin → Users** (admin role only) you can list, create, update (including password
reset), and delete users. Each user gets a **role** that controls what they can see and do.
Roles and permissions (such as `ip_address.approve`) gate the approval workflow.

### Credentials

- **SNMP credentials** — v1/v2c/v3 profiles used by network and asset discovery. Secrets are
  stored encrypted.
- **WinRM profiles** — Windows remote-management credentials for WinRM asset discovery.

### Software updates

The **Admin → Updates** area checks the GitHub releases of SubnetIQ and can automatically
update the running stack to a newer version.

---

## Working with the REST API

Everything the UI does is available over the REST API (see **Help & Documentation** in the app
for the full endpoint reference).

Get a token:

```bash
curl -X POST http://your-server:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your_password"}'
```

Then authenticate every request:

```bash
curl http://your-server:3000/api/v1/subnets/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

If MFA is enabled on the account, include `"mfa_code": "123456"` in the login request.

---

## Self-Hosting

See the [README](../README.md) for full deployment instructions. In short:

```bash
git clone https://github.com/K1NGPINGG/SubnetIQ.git
cd SubnetIQ
cp .env.example .env   # then edit your secrets
docker compose up -d --build
open http://localhost:3000
```

**Never commit your `.env` file** — it contains secrets.

---

## Troubleshooting

- **Can't log in?** Confirm your email/password; if MFA is enabled you must also enter the
  current TOTP code.
- **Scan status looks stale?** Scan statuses auto-refresh every few seconds; if a scan stays
  `running` unusually long, check the System Logs or cancel and re-run it.
- **IP create rejected?** A validation rule may be blocking it — check the error message and
  your Validation Rules.
- **Webhook not delivered?** Check the System Logs for failed async deliveries and confirm the
  webhook is enabled.
