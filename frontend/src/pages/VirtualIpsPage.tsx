import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Trash2, Search, Layers } from "lucide-react";
import {
  useIpAddresses,
  useCreateIp,
  useUpdateIp,
  useDeleteIp,
  useSubnets,
} from "@/hooks/api";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { Modal } from "@/components/ui/Modal";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { IPAddress } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { IpFormModal } from "@/pages/IpsPage";

const col = createColumnHelper<IPAddress>();

const statusVariant: Record<string, "success" | "warning" | "info" | "default" | "danger"> = {
  allocated: "success",
  reserved: "warning",
  available: "info",
  unavailable: "danger",
  unused: "default",
};

export default function VirtualIpsPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<IPAddress | null>(null);
  const [deleteItem, setDeleteItem] = useState<IPAddress | null>(null);

  const { data: allIps = [], isLoading } = useIpAddresses();
  const { data: subnets = [] } = useSubnets();
  const createMutation = useCreateIp();
  const updateMutation = useUpdateIp();
  const deleteMutation = useDeleteIp();

  const vips = allIps.filter((ip) => ip.is_vip);

  const filtered = search
    ? vips.filter(
        (ip) =>
          ip.address.toLowerCase().includes(search.toLowerCase()) ||
          (ip.hostname ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : vips;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.accessor("address", {
      header: "IP Address",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
            {info.getValue()}
          </span>
          <span
            title={`Virtual IP (${((info.row.original as IPAddress).vip_type ?? "unknown")})`}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              dark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"
            }`}
          >
            <Layers className="h-3 w-3" />
            VIP
          </span>
        </div>
      ),
    }),
    col.accessor("hostname", {
      header: "Hostname",
      cell: (info) => info.getValue() ?? "â€”",
    }),
    col.accessor("vip_type" as any, {
      header: "VIP Type",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        return ip.vip_type ? <Badge variant="default">{ip.vip_type}</Badge> : "â€”";
      },
    }),
    col.accessor("node_bindings" as any, {
      header: "Backing Nodes",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        if (!ip.node_bindings || ip.node_bindings.length === 0) return "â€”";
        return (
          <div className="flex flex-wrap gap-1">
            {ip.node_bindings.map((b) => (
              <span
                key={b.id ?? b.node_ip_id}
                title={`${b.role ?? "node"}: ${b.node_ip_address ?? b.node_ip_id}`}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
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
    col.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant={statusVariant[info.getValue() as string] ?? "default"}>
          {info.getValue() as string}
        </Badge>
      ),
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
                    <EditButton onClick={() => setEditItem(info.row.original as IPAddress)} />
          <button
            onClick={() => setDeleteItem(info.row.original as IPAddress)}
            className={`rounded p-1.5 ${dark ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400" : "text-gray-500 hover:bg-red-50 hover:text-red-600"}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ];

  const inputClass = `w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Search VIPs..."
            className={inputClass}
          />
        </div>
        <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {filtered.length} VIP{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Virtual IP
          </button>
        </div>
      </div>

      {vips.length === 0 ? (
        <div className={`rounded-lg border border-dashed p-12 text-center ${dark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-white"}`}>
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-4 text-lg font-medium ${dark ? "text-white" : "text-gray-900"}`}>
            No Virtual IPs yet
          </h3>
          <p className={`mt-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Mark an IP address as a VIP on the IP Addresses page, or use &ldquo;Add Virtual IP&rdquo;
            to create one.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pagedData}
          pageCount={pageCount}
          pagination={{ ...pagination, pageIndex: safePageIndex }}
          onPaginationChange={setPagination}
          loading={isLoading}
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
          allIps={allIps}
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
          allIps={allIps}
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
            is_vip: true,
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
          title="Delete Virtual IP"
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
            Are you sure you want to delete VIP{" "}
            <strong className="font-mono">{deleteItem.address}</strong>? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
