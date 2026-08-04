import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Search } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useSubnets,
  useCreateSubnet,
  useUpdateSubnet,
  useDeleteSubnet,
  useSites,
  useVlans,
} from "@/hooks/api";
import { subnetCreateSchema, subnetUpdateSchema } from "@/lib/validators";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { Modal } from "@/components/ui/Modal";
import type { Subnet, SubnetCreate, SubnetUpdate } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";

const col = createColumnHelper<Subnet>();

export default function SubnetsPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subnet | null>(null);
  const [deleteItem, setDeleteItem] = useState<Subnet | null>(null);

  const { data = [], isLoading } = useSubnets();
  const { data: sites = [] } = useSites();
  const { data: vlans = [] } = useVlans();
  const createMutation = useCreateSubnet();
  const updateMutation = useUpdateSubnet();
  const deleteMutation = useDeleteSubnet();

  const filtered = search
    ? data.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.network_address.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.accessor("name", {
      header: "Name",
      cell: (info) => (
        <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{info.getValue()}</span>
      ),
    }),
    col.accessor("network_address", { header: "Network" }),
    col.accessor("prefix_length", {
      header: "Prefix",
      cell: (info) => `/${info.getValue()}`,
    }),
    col.accessor("gateway", {
      header: "Gateway",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("site_id", {
      header: "Site",
      cell: (info) => {
        const site = sites.find((s) => s.id === info.getValue());
        return site?.name ?? "—";
      },
    }),
    col.accessor("vlan_id", {
      header: "VLAN",
      cell: (info) => {
        const vlan = vlans.find((v) => v.id === info.getValue());
        return vlan ? <Badge variant="info">{vlan.name}</Badge> : "—";
      },
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
                    <EditButton onClick={() => setEditItem(info.row.original)} />
          <button
            onClick={() => setDeleteItem(info.row.original)}
            className={`rounded p-1.5 ${dark ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400" : "text-gray-500 hover:bg-red-50 hover:text-red-600"}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Search subnets..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Subnet
        </button>
      </div>

      <DataTable
        columns={columns}
        data={pagedData}
        pageCount={pageCount}
        pagination={{ ...pagination, pageIndex: safePageIndex }}
        onPaginationChange={setPagination}
        loading={isLoading}
      />

      {createOpen && (
        <SubnetFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d, { onSuccess: () => setCreateOpen(false) })
          }
          sites={sites}
          vlans={vlans}
          loading={createMutation.isPending}
          schema={subnetCreateSchema}
          mode="create"
        />
      )}

      {editItem && (
        <SubnetFormModal
          open
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          sites={sites}
          vlans={vlans}
          loading={updateMutation.isPending}
          schema={subnetUpdateSchema}
          mode="edit"
          defaultValues={{
            name: editItem.name,
            description: editItem.description ?? "",
            gateway: editItem.gateway ?? "",
            dns_servers: editItem.dns_servers ?? "",
            site_id: editItem.site_id ?? undefined,
            vlan_id: editItem.vlan_id ?? undefined,
            parent_subnet_id: editItem.parent_subnet_id ?? undefined,
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete Subnet"
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
          <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
            Are you sure you want to delete subnet{" "}
            <strong>{deleteItem.name}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

function SubnetFormModal({
  open,
  onClose,
  onSubmit,
  sites,
  vlans,
  loading,
  schema,
  mode,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  sites: any[];
  vlans: any[];
  loading: boolean;
  schema: any;
  mode: "create" | "edit";
  defaultValues?: any;
}) {
  const dark = useThemeStore((s) => s.dark);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add Subnet" : "Edit Subnet"}
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
            form="subnet-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="subnet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === "create" && (
          <>
            <div>
              <label className={labelClass}>Network Address</label>
              <input
                {...register("network_address")}
                placeholder="192.168.1.0/24"
                className={inputClass}
              />
              {errors.network_address && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.network_address?.message as string}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Prefix Length</label>
              <input
                type="number"
                {...register("prefix_length", { valueAsNumber: true })}
                placeholder="24"
                className={inputClass}
              />
              {errors.prefix_length && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.prefix_length?.message as string}
                </p>
              )}
            </div>
          </>
        )}
        <div>
          <label className={labelClass}>Name</label>
          <input {...register("name")} className={inputClass} />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name?.message as string}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input {...register("description")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Gateway</label>
          <input {...register("gateway")} placeholder="192.168.1.1" className={inputClass} />
          {errors.gateway && (
            <p className="mt-1 text-xs text-red-600">
              {errors.gateway?.message as string}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>DNS Servers</label>
          <input {...register("dns_servers")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Site</label>
          <select {...register("site_id")} className={inputClass}>
            <option value="">None</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>VLAN</label>
          <select {...register("vlan_id")} className={inputClass}>
            <option value="">None</option>
            {vlans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
