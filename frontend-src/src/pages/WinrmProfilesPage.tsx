import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Search, Eye, EyeOff, Monitor } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useWinrmCredentials,
  useCreateWinrmCredential,
  useUpdateWinrmCredential,
  useDeleteWinrmCredential,
} from "@/hooks/api";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { Modal } from "@/components/ui/Modal";
import type { WinRMCredential, WinRMCredentialCreate } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";

const col = createColumnHelper<WinRMCredential>();

const winrmCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  port: z.coerce.number().int().min(1).max(65535).default(5985),
  use_ssl: z.boolean().default(false),
  auth_type: z.enum(["basic", "kerberos", "negotiate"]).default("basic"),
  domain: z.string().optional().or(z.literal("")),
});

type WinrmForm = z.infer<typeof winrmCreateSchema>;

export default function WinrmProfilesPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<WinRMCredential | null>(null);
  const [deleteItem, setDeleteItem] = useState<WinRMCredential | null>(null);

  const { data = [], isLoading } = useWinrmCredentials();
  const createMutation = useCreateWinrmCredential();
  const updateMutation = useUpdateWinrmCredential();
  const deleteMutation = useDeleteWinrmCredential();

  const filtered = search
    ? data.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.username.toLowerCase().includes(search.toLowerCase())
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
    col.accessor("username", {
      header: "Username",
    }),
    col.accessor("port", {
      header: "Port",
      cell: (info) => (
        <Badge variant="info">{info.getValue()}</Badge>
      ),
    }),
    col.accessor("use_ssl", {
      header: "SSL",
      cell: (info) => (
        <Badge variant={info.getValue() ? "success" : "default"}>
          {info.getValue() ? "HTTPS" : "HTTP"}
        </Badge>
      ),
    }),
    col.accessor("auth_type", {
      header: "Auth Type",
      cell: (info) => (
        <Badge variant="default">{info.getValue()}</Badge>
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
            placeholder="Search WinRM profiles..."
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
          Add WinRM Profile
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
        <WinrmFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d as WinRMCredentialCreate, {
              onSuccess: () => setCreateOpen(false),
            })
          }
          loading={createMutation.isPending}
          mode="create"
        />
      )}

      {editItem && (
        <WinrmFormModal
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
            username: editItem.username,
            password: "",
            port: editItem.port,
            use_ssl: editItem.use_ssl,
            auth_type: editItem.auth_type,
            domain: editItem.domain ?? "",
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete WinRM Profile"
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
            Are you sure you want to delete WinRM profile{" "}
            <strong>{deleteItem.name}</strong>? This may affect running discovery scans.
          </p>
        </Modal>
      )}
    </div>
  );
}

function WinrmFormModal({
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
    formState: { errors },
  } = useForm<WinrmForm>({
    resolver: zodResolver(winrmCreateSchema),
    defaultValues: defaultValues ?? { port: 5985, use_ssl: false, auth_type: "basic" },
  });

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
      title={mode === "create" ? "Add WinRM Profile" : "Edit WinRM Profile"}
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
            form="winrm-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="winrm-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Profile Name</label>
          <input
            {...register("name")}
            className={inputClass}
            placeholder="e.g. Domain Admin, Server Room"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Username</label>
          <input
            {...register("username")}
            className={inputClass}
            placeholder="DOMAIN\\username or username@domain.com"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showSecrets ? "text" : "password"}
              className={inputClass}
              placeholder={mode === "edit" ? "Leave blank to keep current" : "Enter password"}
            />
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Port</label>
            <input
              {...register("port")}
              type="number"
              className={inputClass}
            />
            {errors.port && (
              <p className="mt-1 text-xs text-red-600">{errors.port.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Auth Type</label>
            <select {...register("auth_type")} className={inputClass}>
              <option value="basic">Basic</option>
              <option value="negotiate">Negotiate (NTLM)</option>
              <option value="kerberos">Kerberos</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Domain (optional)</label>
            <input
              {...register("domain")}
              className={inputClass}
              placeholder="CORP"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_ssl"
            {...register("use_ssl")}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="use_ssl" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Use HTTPS / SSL (port 5986)
          </label>
        </div>
      </form>
    </Modal>
  );
}
