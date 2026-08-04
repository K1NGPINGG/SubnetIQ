import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Search, Shield, Eye, EyeOff } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useSnmpCredentials,
  useCreateSnmpCredential,
  useUpdateSnmpCredential,
  useDeleteSnmpCredential,
} from "@/hooks/api";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { Modal } from "@/components/ui/Modal";
import type { SnmpCredential, SnmpCredentialCreate } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";

const col = createColumnHelper<SnmpCredential>();

const snmpCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  version: z.enum(["v1", "v2c", "v3"]),
  community_string: z.string().optional().or(z.literal("")),
  v3_username: z.string().optional().or(z.literal("")),
  v3_auth_protocol: z.string().optional().or(z.literal("")),
  v3_auth_passphrase: z.string().optional().or(z.literal("")),
  v3_priv_protocol: z.string().optional().or(z.literal("")),
  v3_priv_passphrase: z.string().optional().or(z.literal("")),
  v3_security_level: z.string().optional().or(z.literal("")),
});

type SnmpForm = z.infer<typeof snmpCreateSchema>;

export default function SnmpProfilesPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<SnmpCredential | null>(null);
  const [deleteItem, setDeleteItem] = useState<SnmpCredential | null>(null);

  const { data = [], isLoading } = useSnmpCredentials();
  const createMutation = useCreateSnmpCredential();
  const updateMutation = useUpdateSnmpCredential();
  const deleteMutation = useDeleteSnmpCredential();

  const filtered = search
    ? data.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.version.toLowerCase().includes(search.toLowerCase())
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
        <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("version", {
      header: "Version",
      cell: (info) => (
        <Badge variant="info">{info.getValue().toUpperCase()}</Badge>
      ),
    }),
    col.accessor("is_active", {
      header: "Status",
      cell: (info) => (
        <Badge variant={info.getValue() ? "success" : "danger"}>
          {info.getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
                    <EditButton onClick={() => setEditItem(info.row.original)} />
          <button
            onClick={() => setDeleteItem(info.row.original)}
            className={`rounded p-1.5 ${
              dark
                ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                : "text-gray-500 hover:bg-red-50 hover:text-red-600"
            }`}
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
            placeholder="Search SNMP profiles..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              dark
                ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400"
                : "border-gray-300"
            }`}
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add SNMP Profile
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
        <SnmpFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d as SnmpCredentialCreate, {
              onSuccess: () => setCreateOpen(false),
            })
          }
          loading={createMutation.isPending}
          mode="create"
        />
      )}

      {editItem && (
        <SnmpFormModal
          open
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          loading={updateMutation.isPending}
          mode="edit"
          defaultValues={{
            name: editItem.name,
            version: editItem.version,
            community_string: editItem.community_string ?? "",
            v3_username: editItem.v3_username ?? "",
            v3_auth_protocol: editItem.v3_auth_protocol ?? "NONE",
            v3_auth_passphrase: editItem.v3_auth_passphrase ?? "",
            v3_priv_protocol: editItem.v3_priv_protocol ?? "NONE",
            v3_priv_passphrase: editItem.v3_priv_passphrase ?? "",
            v3_security_level: editItem.v3_security_level ?? "authPriv",
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete SNMP Profile"
          footer={
            <>
              <button
                onClick={() => setDeleteItem(null)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  dark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
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
            Are you sure you want to delete SNMP profile{" "}
            <strong>{deleteItem.name}</strong>? This may affect running discovery scans.
          </p>
        </Modal>
      )}
    </div>
  );
}

function SnmpFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  mode,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
  mode: "create" | "edit";
  defaultValues?: any;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [showSecrets, setShowSecrets] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SnmpForm>({
    resolver: zodResolver(snmpCreateSchema),
    defaultValues: defaultValues ?? { version: "v2c" },
  });

  const version = watch("version");

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;
  const labelClass = `mb-1 block text-sm font-medium ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add SNMP Profile" : "Edit SNMP Profile"}
      maxWidth="max-w-xl"
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              dark
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="snmp-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="snmp-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Profile Name</label>
          <input
            {...register("name")}
            className={inputClass}
            placeholder="e.g. Office v2c, Data Center v3"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>SNMP Version</label>
          <select {...register("version")} className={inputClass}>
            <option value="v1">v1</option>
            <option value="v2c">v2c</option>
            <option value="v3">v3</option>
          </select>
        </div>

        {/* v1/v2c fields */}
        {(version === "v1" || version === "v2c") && (
          <div>
            <label className={labelClass}>Community String</label>
            <div className="relative">
              <input
                {...register("community_string")}
                type={showSecrets ? "text" : "password"}
                className={inputClass}
                placeholder="e.g. public, private"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* v3 fields */}
        {version === "v3" && (
          <>
            <div>
              <label className={labelClass}>Username</label>
              <input {...register("v3_username")} className={inputClass} placeholder="SNMPv3 username" />
            </div>

            <div>
              <label className={labelClass}>Security Level</label>
              <select {...register("v3_security_level")} className={inputClass}>
                <option value="noAuthNoPriv">noAuthNoPriv</option>
                <option value="authNoPriv">authNoPriv</option>
                <option value="authPriv">authPriv (recommended)</option>
              </select>
            </div>

            {(watch("v3_security_level") === "authNoPriv" ||
              watch("v3_security_level") === "authPriv") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Auth Protocol</label>
                  <select {...register("v3_auth_protocol")} className={inputClass}>
                    <option value="NONE">None</option>
                    <option value="MD5">MD5</option>
                    <option value="SHA">SHA</option>
                    <option value="SHA256">SHA256</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Auth Passphrase</label>
                  <input
                    {...register("v3_auth_passphrase")}
                    type={showSecrets ? "text" : "password"}
                    className={inputClass}
                    placeholder="Auth passphrase"
                  />
                </div>
              </div>
            )}

            {watch("v3_security_level") === "authPriv" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Privacy Protocol</label>
                  <select {...register("v3_priv_protocol")} className={inputClass}>
                    <option value="NONE">None</option>
                    <option value="DES">DES</option>
                    <option value="AES">AES</option>
                    <option value="AES256">AES256</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Privacy Passphrase</label>
                  <input
                    {...register("v3_priv_passphrase")}
                    type={showSecrets ? "text" : "password"}
                    className={inputClass}
                    placeholder="Privacy passphrase"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
