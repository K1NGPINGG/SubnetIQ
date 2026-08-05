import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Wifi, WifiOff, RefreshCw, Download, Check, Edit, Layers, X } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useIpAddresses,
  useCreateIp,
  useUpdateIp,
  useDeleteIp,
  useAllocateIp,
  useSubnets,
  useLatestScan,
} from "@/hooks/api";
import {
  ipAddressCreateSchema,
  ipAddressUpdateSchema,
  ipAllocationSchema,
} from "@/lib/validators";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { DeleteButton } from "@/components/ui/DeleteButton";

import { Modal } from "@/components/ui/Modal";
import { useThemeStore } from "@/shared/lib/theme-store";
import { usePermission } from "@/shared/lib/use-permission";
import type {
  IPAddress,
  IPAddressCreate,
  IPAddressUpdate,
  IPAllocationRequest,
  Subnet,
  DiscoveredHost,
} from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";

const col = createColumnHelper<DiscoveredHost | IPAddress>();

const statusVariant: Record<string, "success" | "warning" | "info" | "default" | "danger"> = {
  allocated: "success",
  reserved: "warning",
  available: "info",
  unavailable: "danger",
  unused: "default",
};

function ScanResultsView({ subnet }: { subnet: Subnet }) {
  const dark = useThemeStore((s) => s.dark);
  const { canWrite } = usePermission();
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const { data: scanData, isLoading, refetch } = useLatestScan(subnet.id);
  const createIp = useCreateIp();

  const hosts: DiscoveredHost[] = scanData?.results?.discovered_hosts ?? [];
  const aliveCount = scanData?.results?.alive_hosts ?? 0;
  const deadCount = scanData?.results?.dead_hosts ?? 0;

  const filtered = search
    ? hosts.filter(
        (h) =>
          h.address.toLowerCase().includes(search.toLowerCase()) ||
          (h.hostname ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (h.db_assigned_to ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : hosts;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const unimportedAlive = hosts.filter(
    (h) => h.is_alive && !h.in_database && !imported.has(h.address)
  );

  const handleImport = async (host: DiscoveredHost) => {
    setImporting(host.address);
    try {
      await createIp.mutateAsync({
        address: host.address,
        subnet_id: subnet.id,
        hostname: host.hostname ?? undefined,
        mac_address: host.mac_address ?? undefined,
        status: "allocated",
      });
      setImported((prev) => new Set([...prev, host.address]));
    } catch {
    } finally {
      setImporting(null);
    }
  };

  const handleImportAll = async () => {
    for (const host of unimportedAlive) {
      if (importing) continue;
      await handleImport(host);
    }
  };

  const columns = [
    col.accessor("address", {
      header: "IP Address",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        return (
          <span className={`font-mono font-medium ${host.is_alive ? (dark ? "text-red-400" : "text-red-700") : (dark ? "text-green-400" : "text-green-700")}`}>
            {info.getValue()}
          </span>
        );
      },
    }),
    col.accessor("hostname" as any, {
      header: "Hostname",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        return host.hostname ?? "—";
      },
    }),
    col.accessor("is_alive" as any, {
      header: "Status",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        if (host.is_alive) {
          return (
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <Badge variant="danger">In Use</Badge>
              {host.response_time_ms != null && (
                <span className="text-xs text-gray-400">{host.response_time_ms}ms</span>
              )}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <Badge variant="info">Available</Badge>
          </div>
        );
      },
    }),
    col.accessor("scan_method" as any, {
      header: "Method",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        return <span className="text-xs text-gray-500 uppercase">{host.scan_method ?? "—"}</span>;
      },
    }),
    col.accessor("mac_address" as any, {
      header: "MAC Address",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        return host.mac_address ? (
          <span className="font-mono text-xs">{host.mac_address}</span>
        ) : "—";
      },
    }),
    col.accessor("sys_descr" as any, {
      header: "System Description",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        return host.sys_descr ? (
          <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`} title={host.sys_descr}>
            {host.sys_descr.length > 40 ? host.sys_descr.slice(0, 40) + "..." : host.sys_descr}
          </span>
        ) : "—";
      },
    }),
    col.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const host = info.row.original as DiscoveredHost;
        const alreadyInDb = host.in_database;
        const wasImported = imported.has(host.address);
        if (alreadyInDb || wasImported) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3.5 w-3.5" /> In IPAM
            </span>
          );
        }
        if (!host.is_alive || !canWrite) return null;
        return (
          <button
            onClick={() => handleImport(host)}
            disabled={importing === host.address}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            {importing === host.address ? "Adding..." : "Import"}
          </button>
        );
      },
    }),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-500">Loading scan results...</span>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className={`rounded-lg border border-dashed p-12 text-center ${dark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-white"}`}>
        <WifiOff className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className={`mt-4 text-lg font-medium ${dark ? "text-white" : "text-gray-900"}`}>No scan results</h3>
        <p className={`mt-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          No completed discovery scan found for subnet {subnet.network_address}/{subnet.prefix_length}.
          Go to the Discovery tab to run a scan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              Scan Results: {subnet.name} ({subnet.network_address}/{subnet.prefix_length})
            </h3>
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Scanned {scanData.results?.total_hosts_scanned ?? 0} hosts on{" "}
              {scanData.completed_at ? new Date(scanData.completed_at).toLocaleString() : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            {unimportedAlive.length > 0 && canWrite && (
              <button
                onClick={handleImportAll}
                disabled={!!importing}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Import {unimportedAlive.length} Alive to IPAM
              </button>
            )}
            <button
              onClick={() => refetch()}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{aliveCount} In Use</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{deadCount} Available</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Search IPs..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{filtered.length} hosts</span>
      </div>

      <DataTable
        columns={columns}
        data={pagedData}
        pageCount={pageCount}
        pagination={{ ...pagination, pageIndex: safePageIndex }}
        onPaginationChange={setPagination}
        loading={isLoading}
      />
    </div>
  );
}

export default function IpsPage() {
  const dark = useThemeStore((s) => s.dark);
  const { canWrite } = usePermission();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subnetFilter, setSubnetFilter] = useState("");
  const [vipFilter, setVipFilter] = useState<"all" | "static" | "vip">("all");
  const [viewMode, setViewMode] = useState<"db" | "scan">("db");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<IPAddress | null>(null);
  const [deleteItem, setDeleteItem] = useState<IPAddress | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const { data = [], isLoading } = useIpAddresses();
  const { data: subnets = [] } = useSubnets();
  const createMutation = useCreateIp();
  const updateMutation = useUpdateIp();
  const deleteMutation = useDeleteIp();
  const allocateMutation = useAllocateIp();

  const selectedSubnet = subnets.find((s) => s.id === subnetFilter);

  const filtered = data.filter((ip) => {
    const matchesSearch =
      !search ||
      ip.address.toLowerCase().includes(search.toLowerCase()) ||
      (ip.hostname ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || ip.status === statusFilter;
    const matchesSubnet = !subnetFilter || ip.subnet_id === subnetFilter;
    const matchesVip =
      vipFilter === "all" || (vipFilter === "vip" ? ip.is_vip : !ip.is_vip);
    return matchesSearch && matchesStatus && matchesSubnet && matchesVip;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const dbColumns = [
    ...(canWrite
      ? [
          col.display({
            id: "select",
            header: () => (
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(filtered.map((ip) => ip.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            ),
            cell: (info) => {
              const ip = info.row.original as IPAddress;
              return (
                <input
                  type="checkbox"
                  checked={selectedIds.has(ip.id)}
                  onChange={(e) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(ip.id);
                      else next.delete(ip.id);
                      return next;
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              );
            },
          }),
        ]
      : []),
    col.accessor("address", {
      header: "IP Address",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
              {info.getValue()}
            </span>
            {ip.is_vip && (
              <span
                title={`Virtual IP (${ip.vip_type ?? "unknown"})`}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  dark
                    ? "bg-purple-900/40 text-purple-300"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                <Layers className="h-3 w-3" />
                VIP
              </span>
            )}
          </div>
        );
      },
    }),
    col.accessor("vip_type" as any, {
      header: "VIP Type",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        if (!ip.is_vip || !ip.vip_type) return "—";
        return (
          <Badge variant="default">{ip.vip_type}</Badge>
        );
      },
    }),
    col.accessor("node_bindings" as any, {
      header: "VIP Nodes",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        if (!ip.is_vip || !ip.node_bindings || ip.node_bindings.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {ip.node_bindings.map((b) => (
              <span
                key={b.id ?? b.node_ip_id}
                title={`${b.role ?? "node"}: ${b.node_ip_address ?? b.node_ip_id}`}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  dark
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className={`font-sans font-semibold ${dark ? "text-purple-300" : "text-purple-700"}`}>
                  {b.role ?? "node"}
                </span>
                {b.node_ip_address ?? b.node_ip_id}
              </span>
            ))}
          </div>
        );
      },
    }),
    col.accessor("hostname", {
      header: "Hostname",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <Badge variant={statusVariant[val] ?? "default"}>
            {val}
          </Badge>
        );
      },
    }),
    col.accessor("mac_address", {
      header: "MAC Address",
      cell: (info) => info.getValue() ? (
        <span className={`font-mono text-xs ${dark ? "text-gray-300" : "text-gray-600"}`}>{info.getValue()}</span>
      ) : "—",
    }),
    col.accessor("device_type", {
      header: "Device Type",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("assigned_to", {
      header: "Assigned To",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("subnet_id", {
      header: "Subnet",
      cell: (info) => {
        const subnet = subnets.find((s) => s.id === info.getValue());
        return subnet ? (
          <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {subnet.network_address}/{subnet.prefix_length}
          </span>
        ) : "—";
      },
    }),
    col.accessor("created_at" as any, {
      header: "Created",
      cell: (info) => (
        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
    }),
    ...(canWrite
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => (
              <div className="flex items-center gap-1">
                <EditButton onClick={() => setEditItem(info.row.original as IPAddress)} />
                <DeleteButton onClick={() => setDeleteItem(info.row.original as IPAddress)} />
              </div>
            ),
          }),
        ]
      : []),
  ];

  const showScanView = subnetFilter && selectedSubnet;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={subnetFilter}
          onChange={(e) => {
            setSubnetFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          className={`rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white" : "border-gray-300"}`}
        >
          <option value="">Select a subnet to view scan results</option>
          {subnets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.network_address}/{s.prefix_length})
            </option>
          ))}
        </select>

        {showScanView && (
          <>
            <button
              onClick={() => setViewMode("scan")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                viewMode === "scan"
                  ? "bg-blue-600 text-white"
                  : dark ? "border border-gray-600 text-gray-300 hover:bg-gray-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Wifi className="h-4 w-4" />
              Scan Results
            </button>
            <button
              onClick={() => setViewMode("db")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                viewMode === "db"
                  ? "bg-blue-600 text-white"
                  : dark ? "border border-gray-600 text-gray-300 hover:bg-gray-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Database Records
            </button>
          </>
        )}

        {!showScanView && (
          <>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                placeholder="Search IPs..."
                className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              className={`rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white" : "border-gray-300"}`}
            >
              <option value="">All Status</option>
              <option value="allocated">Allocated</option>
              <option value="reserved">Reserved</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <div className={`flex overflow-hidden rounded-md border text-sm ${dark ? "border-gray-600" : "border-gray-300"}`}>
              {(
                [
                  { value: "all", label: "All IPs" },
                  { value: "static", label: "Static IPs" },
                  { value: "vip", label: "VIPs Only" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setVipFilter(opt.value);
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    vipFilter === opt.value
                      ? "bg-blue-600 text-white"
                      : dark
                        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2">
          {canWrite && (
            <button
              onClick={() => setAllocateOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Allocate IP
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add IP
            </button>
          )}
        </div>
      </div>

      {showScanView && viewMode === "scan" ? (
        <ScanResultsView subnet={selectedSubnet} />
      ) : (
        <>
          {selectedIds.size > 0 && canWrite && (
            <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${dark ? "border-blue-800 bg-blue-900/30" : "border-blue-200 bg-blue-50"}`}>
              <span className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-800"}`}>
                {selectedIds.size} IP{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => setBulkEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Edit className="h-3.5 w-3.5" />
                Bulk Edit
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className={`text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}
              >
                Clear selection
              </button>
            </div>
          )}
          <DataTable
            columns={dbColumns}
            data={pagedData}
            pageCount={pageCount}
            pagination={{ ...pagination, pageIndex: safePageIndex }}
            onPaginationChange={setPagination}
            loading={isLoading}
          />
        </>
      )}

      {allocateOpen && (
        <AllocateIpModal
          open
          onClose={() => setAllocateOpen(false)}
          onSubmit={(d) =>
            allocateMutation.mutate(d, {
              onSuccess: () => setAllocateOpen(false),
            })
          }
          subnets={subnets}
          loading={allocateMutation.isPending}
        />
      )}

      {createOpen && (
        <IpFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d, { onSuccess: () => setCreateOpen(false) })
          }
          subnets={subnets}
          allIps={data}
          loading={createMutation.isPending}
          mode="create"
        />
      )}

      {editItem && (
        <IpFormModal
          open
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          subnets={subnets}
          allIps={data}
          excludeIpId={editItem.id}
          loading={updateMutation.isPending}
          mode="edit"
          defaultValues={{
            hostname: editItem.hostname ?? "",
            status: editItem.status,
            mac_address: editItem.mac_address ?? "",
            device_type: editItem.device_type ?? "",
            description: editItem.description ?? "",
            assigned_to: editItem.assigned_to ?? "",
            subnet_id: editItem.subnet_id,
            is_vip: editItem.is_vip ?? false,
            vip_type: (editItem.vip_type as any) ?? undefined,
            node_bindings: (editItem.node_bindings ?? []).map((b) => ({
              node_ip_id: b.node_ip_id,
              role: (b.role as any) ?? "primary",
            })),
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete IP Address"
          footer={
            <>
              <button
                onClick={() => setDeleteItem(null)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteMutation.mutate(deleteItem.id, {
                    onSuccess: () => setDeleteItem(null),
                  })
                }
                disabled={deleteMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete IP{" "}
            <strong className="font-mono">{deleteItem.address}</strong>? This
            action cannot be undone.
          </p>
        </Modal>
      )}

      {bulkEditOpen && (
        <BulkEditModal
          open
          onClose={() => setBulkEditOpen(false)}
          selectedIds={Array.from(selectedIds)}
          onComplete={() => {
            setBulkEditOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}

function AllocateIpModal({
  open,
  onClose,
  onSubmit,
  subnets,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IPAllocationRequest) => void;
  subnets: Subnet[];
  loading: boolean;
}) {
  const dark = useThemeStore((s) => s.dark);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IPAllocationRequest>({
    resolver: zodResolver(ipAllocationSchema),
  });

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Allocate IP Address"
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="allocate-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Allocating..." : "Allocate"}
          </button>
        </>
      }
    >
      <form
        id="allocate-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <label className={labelClass}>Subnet</label>
          <select {...register("subnet_id")} className={inputClass}>
            <option value="">Select subnet</option>
            {subnets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.network_address}/{s.prefix_length})
              </option>
            ))}
          </select>
          {errors.subnet_id && (
            <p className="mt-1 text-xs text-red-600">
              {errors.subnet_id?.message as string}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Hostname</label>
          <input {...register("hostname")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Device Type</label>
          <input {...register("device_type")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input {...register("description")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Assigned To</label>
          <input {...register("assigned_to")} className={inputClass} />
        </div>
      </form>
    </Modal>
  );
}

export function IpFormModal({
  open,
  onClose,
  onSubmit,
  subnets,
  allIps = [],
  excludeIpId,
  loading,
  mode,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  subnets: Subnet[];
  allIps?: IPAddress[];
  excludeIpId?: string;
  loading: boolean;
  mode: "create" | "edit";
  defaultValues?: any;
}) {
  const dark = useThemeStore((s) => s.dark);
  const schema =
    mode === "create" ? ipAddressCreateSchema : ipAddressUpdateSchema;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const isVip = useWatch({ control, name: "is_vip", defaultValue: false });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "node_bindings",
  });

  const nodeCandidates = allIps.filter((ip) => ip.id !== excludeIpId);

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  const vipTypes = [
    "keepalived",
    "carp_vrrp",
    "load_balancer",
    "kubernetes",
    "floating_cloud",
  ];
  const nodeRoles = ["primary", "backup", "active", "standby"];

  const handleFormSubmit = handleSubmit((data) => {
    const cleaned: any = { ...data };
    if (!cleaned.is_vip) {
      cleaned.vip_type = null;
      cleaned.node_bindings = [];
    } else {
      cleaned.node_bindings = (cleaned.node_bindings ?? []).filter(
        (b: any) => b?.node_ip_id
      );
    }
    onSubmit(cleaned);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add IP Address" : "Edit IP Address"}
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ip-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="ip-form" onSubmit={handleFormSubmit} className="space-y-4">
        {mode === "create" && (
          <>
            <div>
              <label className={labelClass}>IP Address</label>
              <input
                {...register("address")}
                placeholder="192.168.1.10"
                className={inputClass}
              />
              {errors.address && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.address?.message as string}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Subnet</label>
              <select {...register("subnet_id")} className={inputClass}>
                <option value="">Select subnet</option>
                {subnets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.network_address}/{s.prefix_length})
                  </option>
                ))}
              </select>
              {errors.subnet_id && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.subnet_id?.message as string}
                </p>
              )}
            </div>
          </>
        )}
        <div>
          <label className={labelClass}>Hostname</label>
          <input {...register("hostname")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select {...register("status")} className={inputClass}>
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="reserved">Reserved</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>MAC Address</label>
          <input
            {...register("mac_address")}
            placeholder="AA:BB:CC:DD:EE:FF"
            className={inputClass}
          />
          {errors.mac_address && (
            <p className="mt-1 text-xs text-red-600">
              {errors.mac_address?.message as string}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Device Type</label>
          <input {...register("device_type")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input {...register("description")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Assigned To</label>
          <input {...register("assigned_to")} className={inputClass} />
        </div>

        {/* VIP configuration */}
        <div className={`rounded-md border p-3 ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!!isVip}
              onChange={(e) => {
                const checked = e.target.checked;
                setValue("is_vip", checked, { shouldValidate: true });
                if (!checked) setValue("node_bindings", []);
              }}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${dark ? "text-gray-200" : "text-gray-800"}`}>
              <Layers className="h-4 w-4 text-purple-500" />
              Virtual IP (VIP)
            </span>
          </label>

          {isVip && (
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>VIP Type</label>
                <select {...register("vip_type")} className={inputClass}>
                  <option value="">Select VIP type</option>
                  {vipTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.vip_type && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.vip_type?.message as string}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={labelClass}>Backing Node IPs</label>
                  <button
                    type="button"
                    onClick={() => append({ node_ip_id: "", role: "primary" })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add node
                  </button>
                </div>
                {fields.length === 0 && (
                  <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    No backing nodes assigned.
                  </p>
                )}
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <select
                        {...register(`node_bindings.${index}.node_ip_id`)}
                        className={inputClass}
                      >
                        <option value="">Select node IP</option>
                        {nodeCandidates.map((ip) => (
                          <option key={ip.id} value={ip.id}>
                            {ip.address}
                            {ip.hostname ? ` (${ip.hostname})` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        {...register(`node_bindings.${index}.role`)}
                        className={`${inputClass} w-28 shrink-0`}
                      >
                        {nodeRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className={`shrink-0 rounded p-1.5 ${dark ? "text-gray-400 hover:bg-gray-700 hover:text-red-400" : "text-gray-400 hover:bg-gray-100 hover:text-red-600"}`}
                        title="Remove node"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.node_bindings && (
                  <p className="mt-1 text-xs text-red-600">
                    {(errors.node_bindings as any)?.message ??
                      "One or more node bindings are invalid"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function BulkEditModal({
  open,
  onClose,
  selectedIds,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onComplete: () => void;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [status, setStatus] = useState<string>("");
  const [deviceType, setDeviceType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: selectedIds.length });
  const updateMutation = useUpdateIp();

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  const handleSubmit = async () => {
    if (!status && !deviceType) return;
    setSaving(true);
    let done = 0;
    for (const id of selectedIds) {
      const data: Record<string, string> = {};
      if (status) data.status = status;
      if (deviceType) data.device_type = deviceType;
      try {
        await updateMutation.mutateAsync({ id, data: data as any });
      } catch {}
      done++;
      setProgress({ done, total: selectedIds.length });
    }
    onComplete();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bulk Edit ${selectedIds.length} IP Address${selectedIds.length !== 1 ? "es" : ""}`}
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (!status && !deviceType)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? `Updating... ${progress.done}/${progress.total}` : "Apply Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Changes will be applied to all {selectedIds.length} selected IP addresses.
        </p>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="">— No change —</option>
            <option value="allocated">Allocated</option>
            <option value="reserved">Reserved</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Device Type</label>
          <input
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            placeholder="Leave empty to keep unchanged"
            className={inputClass}
          />
        </div>
      </div>
    </Modal>
  );
}
