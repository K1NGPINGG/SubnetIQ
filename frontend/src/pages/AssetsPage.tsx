import { useState, useEffect, useCallback } from "react";
import { createColumnHelper, type PaginationState } from "@tanstack/react-table";
import {
  Search,
  Radar,
  Server,
  Monitor,
  Wifi,
  Printer,
  HelpCircle,
  X,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAssets, useAsset, useRunDiscovery, useSnmpCredentials, useWinrmCredentials, useSubnets } from "@/hooks/api";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";
import type { Asset, AssetDetail, DiscoveryRunRequest } from "@/types/api";

const col = createColumnHelper<Asset>();

const sourceConfig: Record<string, { variant: "info" | "warning" | "success" | "danger" | "default"; label: string }> = {
  SNMP: { variant: "info", label: "SNMP" },
  WINRM: { variant: "warning", label: "WinRM" },
  PING: { variant: "default", label: "Ping" },
  MANUAL: { variant: "success", label: "Manual" },
};

const deviceTypeIcons: Record<string, React.ElementType> = {
  Server: Server,
  Switch: Network,
  Router: Wifi,
  Workstation: Monitor,
  Printer: Printer,
  Unknown: HelpCircle,
};

export default function AssetsPage() {
  const dark = useThemeStore((s) => s.dark);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [runDiscoveryOpen, setRunDiscoveryOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useAssets({
    search: debouncedSearch || undefined,
    discovery_source: sourceFilter || undefined,
    device_type: typeFilter || undefined,
    status: statusFilter || undefined,
    page: pagination.pageIndex,
    page_size: pagination.pageSize,
  });

  const assets = data?.assets ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  const columns = [
    col.accessor("hostname", {
      header: "Hostname",
      cell: (info) => {
        const asset = info.row.original;
        const Icon = deviceTypeIcons[asset.device_type || "Unknown"] || HelpCircle;
        return (
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 flex-shrink-0", dark ? "text-gray-400" : "text-gray-500")} />
            <div>
              <div className={cn("font-medium text-sm", dark ? "text-white" : "text-gray-900")}>
                {info.getValue() || "—"}
              </div>
              {asset.domain && (
                <div className={cn("text-xs", dark ? "text-gray-500" : "text-gray-400")}>
                  {asset.domain}
                </div>
              )}
            </div>
          </div>
        );
      },
    }),
    col.accessor("ip_address", {
      header: "IP Address",
      cell: (info) => (
        <span className={cn("font-mono text-sm", dark ? "text-gray-300" : "text-gray-700")}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("mac_address", {
      header: "MAC Address",
      cell: (info) => (
        <span className={cn("text-xs font-mono", dark ? "text-gray-400" : "text-gray-500")}>
          {info.getValue() || "—"}
        </span>
      ),
    }),
    col.accessor("discovery_source", {
      header: "Source",
      cell: (info) => {
        const cfg = sourceConfig[info.getValue()] ?? sourceConfig.MANUAL;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    }),
    col.accessor("device_type", {
      header: "Type",
      cell: (info) => (
        <span className={cn("text-sm", dark ? "text-gray-300" : "text-gray-700")}>
          {info.getValue() || "Unknown"}
        </span>
      ),
    }),
    col.accessor("manufacturer", {
      header: "Manufacturer",
      cell: (info) => (
        <span className={cn("text-sm", dark ? "text-gray-300" : "text-gray-700")}>
          {info.getValue() || "—"}
        </span>
      ),
    }),
    col.accessor("serial_number", {
      header: "Serial Number",
      cell: (info) => (
        <span className={cn("text-xs font-mono", dark ? "text-gray-400" : "text-gray-500")}>
          {info.getValue() || "—"}
        </span>
      ),
    }),
    col.accessor("os_name", {
      header: "OS",
      cell: (info) => (
        <span className={cn("text-xs max-w-[200px] truncate block", dark ? "text-gray-400" : "text-gray-500")}>
          {info.getValue() || "—"}
        </span>
      ),
    }),
    col.accessor("last_scanned_at", {
      header: "Last Scanned",
      cell: (info) =>
        info.getValue()
          ? new Date(info.getValue()!).toLocaleString()
          : "—",
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const isOnline = info.getValue() === "Online";
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            <span className={cn("text-xs", dark ? "text-gray-300" : "text-gray-600")}>
              {info.getValue()}
            </span>
          </div>
        );
      },
    }),
    col.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <button
          onClick={() => setDetailAsset(info.row.original)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            dark
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          Details
        </button>
      ),
    }),
  ];

  const inputClass = cn(
    "rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-white text-gray-700"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search hostname, IP, serial..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn("w-64 pl-9 pr-3", inputClass)}
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
            className={inputClass}
          >
            <option value="">All Sources</option>
            <option value="SNMP">SNMP</option>
            <option value="WINRM">WinRM</option>
            <option value="PING">Ping</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
            className={inputClass}
          >
            <option value="">All Types</option>
            <option value="Server">Server</option>
            <option value="Switch">Switch</option>
            <option value="Router">Router</option>
            <option value="Workstation">Workstation</option>
            <option value="Printer">Printer</option>
            <option value="Unknown">Unknown</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
            className={inputClass}
          >
            <option value="">All Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Unreachable">Unreachable</option>
          </select>
          <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
            {total} assets
          </span>
        </div>
        <button
          onClick={() => setRunDiscoveryOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Radar className="h-4 w-4" />
          Run Discovery
        </button>
      </div>

      {isError && (
        <div className={cn(
          "rounded-md border p-4 text-sm flex items-center gap-2",
          "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
        )}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorDetail(error) || "Failed to load assets. Please try again."}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={assets}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={isLoading}
      />

      {detailAsset && (
        <AssetDetailModal
          assetId={detailAsset.id}
          onClose={() => setDetailAsset(null)}
        />
      )}

      {runDiscoveryOpen && (
        <RunDiscoveryModal onClose={() => setRunDiscoveryOpen(false)} />
      )}
    </div>
  );
}


function AssetDetailModal({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const dark = useThemeStore((s) => s.dark);
  const { data: asset, isLoading } = useAsset(assetId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Asset Details"
      maxWidth="max-w-2xl"
      footer={
        <button
          onClick={onClose}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium",
            dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          Close
        </button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : !asset ? (
        <p className={cn("text-sm text-center py-8", dark ? "text-gray-400" : "text-gray-500")}>
          Asset not found.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", dark ? "bg-gray-700" : "bg-gray-100")}>
              <Server className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className={cn("text-lg font-semibold", dark ? "text-white" : "text-gray-900")}>
                {asset.hostname || asset.ip_address}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={sourceConfig[asset.discovery_source]?.variant ?? "default"}>
                  {asset.discovery_source}
                </Badge>
                <Badge variant={asset.status === "Online" ? "success" : "danger"}>
                  {asset.status}
                </Badge>
                <span className={cn("text-xs", dark ? "text-gray-400" : "text-gray-500")}>
                  {asset.device_type}
                </span>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <Section title="Network">
            <DetailGrid>
              <DetailItem label="IP Address" value={asset.ip_address} mono />
              <DetailItem label="MAC Address" value={asset.mac_address} mono />
              <DetailItem label="Hostname" value={asset.hostname} />
              <DetailItem label="Domain" value={asset.domain} />
            </DetailGrid>
          </Section>

          {/* Hardware Info */}
          <Section title="Hardware">
            <DetailGrid>
              <DetailItem label="Manufacturer" value={asset.manufacturer} />
              <DetailItem label="Model" value={asset.model} />
              <DetailItem label="Serial Number" value={asset.serial_number} mono />
              <DetailItem label="CPU Cores" value={asset.cpu_cores != null ? String(asset.cpu_cores) : null} icon={Cpu} />
              <DetailItem label="RAM (GB)" value={asset.ram_gb != null ? String(asset.ram_gb) : null} icon={MemoryStick} />
            </DetailGrid>
          </Section>

          {/* OS Info */}
          <Section title="Operating System">
            <DetailGrid>
              <DetailItem label="OS Name" value={asset.os_name} />
              <DetailItem label="OS Version" value={asset.os_version} />
            </DetailGrid>
          </Section>

          {/* Network Interfaces */}
          {asset.network_interfaces && asset.network_interfaces.length > 0 && (
            <Section title="Network Interfaces">
              <div className={cn("overflow-hidden rounded-lg border", dark ? "border-gray-600" : "border-gray-200")}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={cn("border-b", dark ? "border-gray-600 bg-gray-900" : "border-gray-200 bg-gray-50")}>
                      <th className={cn("px-3 py-2 text-left font-semibold", dark ? "text-gray-400" : "text-gray-500")}>Name</th>
                      <th className={cn("px-3 py-2 text-left font-semibold", dark ? "text-gray-400" : "text-gray-500")}>MAC</th>
                      <th className={cn("px-3 py-2 text-left font-semibold", dark ? "text-gray-400" : "text-gray-500")}>IP</th>
                      <th className={cn("px-3 py-2 text-left font-semibold", dark ? "text-gray-400" : "text-gray-500")}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", dark ? "divide-gray-600" : "divide-gray-200")}>
                    {asset.network_interfaces.map((iface: any, idx: number) => (
                      <tr key={idx}>
                        <td className={cn("px-3 py-2", dark ? "text-gray-300" : "text-gray-700")}>{iface.name}</td>
                        <td className={cn("px-3 py-2 font-mono", dark ? "text-gray-400" : "text-gray-500")}>{iface.mac || "—"}</td>
                        <td className={cn("px-3 py-2 font-mono", dark ? "text-gray-400" : "text-gray-500")}>{iface.ip || "—"}</td>
                        <td className="px-3 py-2">
                          {iface.status && (
                            <Badge variant={iface.status === "up" ? "success" : "default"}>
                              {iface.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Raw Scan Data */}
          {asset.raw_scan_data && (
            <Section title="Raw Scan Metadata">
              <pre className={cn(
                "max-h-48 overflow-auto rounded-lg border p-3 text-xs font-mono",
                dark ? "border-gray-600 bg-gray-900 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"
              )}>
                {JSON.stringify(asset.raw_scan_data, null, 2)}
              </pre>
            </Section>
          )}

          {/* Scan Timestamps */}
          <Section title="Scan Info">
            <DetailGrid>
              <DetailItem label="Last Scanned" value={asset.last_scanned_at ? new Date(asset.last_scanned_at).toLocaleString() : null} icon={Clock} />
              <DetailItem label="Created" value={asset.created_at ? new Date(asset.created_at).toLocaleString() : null} />
              <DetailItem label="Updated" value={asset.updated_at ? new Date(asset.updated_at).toLocaleString() : null} />
            </DetailGrid>
          </Section>
        </div>
      )}
    </Modal>
  );
}


function errorDetail(error: unknown): string {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg || String(d)).join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "";
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const dark = useThemeStore((s) => s.dark);
  return (
    <div>
      <h4 className={cn("text-sm font-semibold mb-2", dark ? "text-gray-300" : "text-gray-700")}>{title}</h4>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function DetailItem({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  icon?: React.ElementType;
}) {
  const dark = useThemeStore((s) => s.dark);
  return (
    <div>
      <span className={cn("text-xs font-medium", dark ? "text-gray-400" : "text-gray-500")}>
        {Icon && <Icon className="inline h-3 w-3 mr-1" />}
        {label}
      </span>
      <p className={cn(
        "mt-0.5 text-sm break-all",
        mono && "font-mono text-xs",
        dark ? "text-gray-200" : "text-gray-900"
      )}>
        {value || "—"}
      </p>
    </div>
  );
}


function RunDiscoveryModal({ onClose }: { onClose: () => void }) {
  const dark = useThemeStore((s) => s.dark);
  const runDiscovery = useRunDiscovery();
  const { data: snmpCreds = [] } = useSnmpCredentials();
  const { data: winrmCreds = [] } = useWinrmCredentials();
  const { data: subnets = [] } = useSubnets();

  const [scanType, setScanType] = useState("SNMP");
  const [targetMode, setTargetMode] = useState<"ips" | "subnet">("ips");
  const [targetIps, setTargetIps] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [snmpCredId, setSnmpCredId] = useState("");
  const [winrmCredId, setWinrmCredId] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const inputClass = cn(
    "w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  );
  const labelClass = cn("mb-1 block text-sm font-medium", dark ? "text-gray-300" : "text-gray-700");

  const handleSubmit = () => {
    const ips = targetMode === "ips"
      ? targetIps.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    const req: DiscoveryRunRequest = {
      scan_type: scanType,
      ...(targetMode === "ips" ? { target_ips: ips } : { subnet_id: subnetId }),
      ...(scanType === "SNMP" && snmpCredId ? { snmp_credential_id: snmpCredId } : {}),
      ...(scanType === "SNMP" && !snmpCredId ? { snmp_community: snmpCommunity } : {}),
      ...(scanType === "WINRM" && winrmCredId ? { winrm_credential_id: winrmCredId } : {}),
    };

    runDiscovery.mutate(req, {
      onSuccess: (data) => {
        setToast({ type: "success", message: data.message });
        setTimeout(() => { onClose(); }, 2000);
      },
      onError: (err: any) => {
        setToast({
          type: "error",
          message: errorDetail(err) || "Failed to dispatch discovery scan",
        });
      },
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Run Asset Discovery"
      footer={
        <>
          <button
            onClick={onClose}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium",
              dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={runDiscovery.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {runDiscovery.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dispatching...
              </span>
            ) : (
              "Start Discovery"
            )}
          </button>
        </>
      }
    >
      {toast && (
        <div className={cn(
          "mb-4 rounded-md p-3 text-sm flex items-center gap-2",
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Scan Type</label>
          <select value={scanType} onChange={(e) => setScanType(e.target.value)} className={inputClass}>
            <option value="SNMP">SNMP (Network Devices)</option>
            <option value="WINRM">WinRM (Windows Servers)</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Target</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setTargetMode("ips")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                targetMode === "ips"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              IP Addresses
            </button>
            <button
              type="button"
              onClick={() => setTargetMode("subnet")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                targetMode === "subnet"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Subnet
            </button>
          </div>
          {targetMode === "ips" ? (
            <textarea
              value={targetIps}
              onChange={(e) => setTargetIps(e.target.value)}
              placeholder={"192.168.1.1\n192.168.1.2\n10.0.0.1-10.0.0.10"}
              rows={4}
              className={inputClass}
            />
          ) : (
            <select value={subnetId} onChange={(e) => setSubnetId(e.target.value)} className={inputClass}>
              <option value="">Select subnet</option>
              {subnets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.network_address}/{s.prefix_length})
                </option>
              ))}
            </select>
          )}
        </div>

        {scanType === "SNMP" && (
          <>
            <div>
              <label className={labelClass}>SNMP Profile</label>
              <select
                value={snmpCredId}
                onChange={(e) => setSnmpCredId(e.target.value)}
                className={inputClass}
              >
                <option value="">Default (public community)</option>
                {snmpCreds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.version.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            {!snmpCredId && (
              <div>
                <label className={labelClass}>Community String</label>
                <input
                  type="text"
                  value={snmpCommunity}
                  onChange={(e) => setSnmpCommunity(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </>
        )}

        {scanType === "WINRM" && (
          <div>
            <label className={labelClass}>WinRM Profile</label>
            <select
              value={winrmCredId}
              onChange={(e) => setWinrmCredId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a WinRM profile</option>
              {winrmCreds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.username} : {c.port}{c.use_ssl ? " HTTPS" : " HTTP"})
                </option>
              ))}
            </select>
            {winrmCreds.length === 0 && (
              <p className={cn("mt-1 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
                No WinRM profiles found. Create one in Admin &gt; WinRM.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
