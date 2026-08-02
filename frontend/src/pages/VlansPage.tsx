import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useVlans, useCreateVlan, useUpdateVlan, useDeleteVlan, useSites } from "@/hooks/api";
import { vlanCreateSchema, vlanUpdateSchema } from "@/lib/validators";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import type { VLAN, VLANCreate, VLANUpdate } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";

const col = createColumnHelper<VLAN>();

export default function VlansPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<VLAN | null>(null);
  const [deleteItem, setDeleteItem] = useState<VLAN | null>(null);

  const { data = [], isLoading } = useVlans();
  const { data: sites = [] } = useSites();
  const createMutation = useCreateVlan();
  const updateMutation = useUpdateVlan();
  const deleteMutation = useDeleteVlan();

  const filtered = search
    ? data.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          String(v.vlan_id).includes(search)
      )
    : data;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.accessor("vlan_id", {
      header: "VLAN ID",
      cell: (info) => (
        <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("name", {
      header: "Name",
      cell: (info) => (
        <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{info.getValue()}</span>
      ),
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("site_id", {
      header: "Site",
      cell: (info) => {
        const site = sites.find((s) => s.id === info.getValue());
        return site?.name ?? "—";
      },
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditItem(info.row.original)}
            className={`rounded p-1.5 ${dark ? "text-gray-400 hover:bg-gray-700 hover:text-blue-400" : "text-gray-500 hover:bg-gray-100 hover:text-blue-600"}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
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
            placeholder="Search VLANs..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add VLAN
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
        <VlanFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d, { onSuccess: () => setCreateOpen(false) })
          }
          sites={sites}
          loading={createMutation.isPending}
          mode="create"
        />
      )}

      {editItem && (
        <VlanFormModal
          open
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          sites={sites}
          loading={updateMutation.isPending}
          mode="edit"
          defaultValues={{
            vlan_id: editItem.vlan_id,
            name: editItem.name,
            description: editItem.description ?? "",
            site_id: editItem.site_id ?? undefined,
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete VLAN"
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
            Are you sure you want to delete VLAN{" "}
            <strong>{deleteItem.name}</strong> (ID: {deleteItem.vlan_id})? This
            action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

function VlanFormModal({
  open,
  onClose,
  onSubmit,
  sites,
  loading,
  mode,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  sites: any[];
  loading: boolean;
  mode: "create" | "edit";
  defaultValues?: any;
}) {
  const dark = useThemeStore((s) => s.dark);
  const schema = mode === "create" ? vlanCreateSchema : vlanUpdateSchema;

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
      title={mode === "create" ? "Add VLAN" : "Edit VLAN"}
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
            form="vlan-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="vlan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>VLAN ID</label>
          <input
            type="number"
            {...register("vlan_id", { valueAsNumber: true })}
            placeholder="100"
            className={inputClass}
          />
          {errors.vlan_id && (
            <p className="mt-1 text-xs text-red-600">
              {errors.vlan_id?.message as string}
            </p>
          )}
        </div>
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
      </form>
    </Modal>
  );
}
