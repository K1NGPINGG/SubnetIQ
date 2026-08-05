import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { DeleteButton } from "@/components/ui/DeleteButton";

import { useThemeStore } from "@/shared/lib/theme-store";
import type { PaginationState } from "@tanstack/react-table";
import type { AnyZodObject } from "zod";

export interface CrudField {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "boolean" | "color";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  help?: string;
}

export interface CrudConfig<T extends { id: string }> {
  entityLabel: string;
  searchPlaceholder: string;
  fields: CrudField[];
  createSchema: AnyZodObject;
  updateSchema: AnyZodObject;
  emptyCreate: () => Record<string, unknown>;
  toFormValues: (item: T) => Record<string, unknown>;
  columns: ColumnDef<T, any>[];
  defaultOpen?: boolean;
}

export function CrudPage<T extends { id: string }>({
  entityLabel,
  searchPlaceholder,
  fields,
  createSchema,
  updateSchema,
  emptyCreate,
  toFormValues,
  columns,
  useList,
  useCreate,
  useUpdate,
  useDelete,
  transformSubmit,
}: {
  entityLabel: string;
  searchPlaceholder: string;
  fields: CrudField[];
  createSchema: AnyZodObject;
  updateSchema: AnyZodObject;
  emptyCreate: () => Record<string, unknown>;
  toFormValues: (item: T) => Record<string, unknown>;
  columns: ColumnDef<T, any>[];
  useList: () => { data?: T[]; isLoading: boolean };
  useCreate: () => { mutate: (data: any, opts?: any) => void; isPending: boolean };
  useUpdate: () => { mutate: (args: any, opts?: any) => void; isPending: boolean };
  useDelete: () => { mutate: (id: string, opts?: any) => void; isPending: boolean };
  transformSubmit?: (data: Record<string, unknown>) => Record<string, unknown>;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);

  const { data = [], isLoading } = useList();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();

  const searchable = (item: T) => JSON.stringify(item).toLowerCase();

  const filtered = search
    ? data.filter((item) => searchable(item).includes(search.toLowerCase()))
    : data;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const actionCol: ColumnDef<T, any> = {
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex items-center gap-1">
        <EditButton onClick={() => setEditItem(info.row.original)} />
                  <DeleteButton onClick={() => setDeleteItem(info.row.original)} />
      </div>
    ),
  };

  const allColumns = [...columns, actionCol];

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
            placeholder={searchPlaceholder}
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add {entityLabel}
        </button>
      </div>

      <DataTable
        columns={allColumns}
        data={pagedData}
        pageCount={pageCount}
        pagination={{ ...pagination, pageIndex: safePageIndex }}
        onPaginationChange={setPagination}
        loading={isLoading}
      />

      {createOpen && (
        <CrudFormModal
          open
          entityLabel={entityLabel}
          fields={fields}
          schema={createSchema}
          mode="create"
          defaultValues={emptyCreate()}
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(
              transformSubmit ? transformSubmit(d) : d,
              { onSuccess: () => setCreateOpen(false) }
            )
          }
          loading={createMutation.isPending}
        />
      )}

      {editItem && (
        <CrudFormModal
          open
          entityLabel={entityLabel}
          fields={fields}
          schema={updateSchema}
          mode="edit"
          defaultValues={toFormValues(editItem)}
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: transformSubmit ? transformSubmit(d) : d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          loading={updateMutation.isPending}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title={`Delete ${entityLabel}`}
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
            Are you sure you want to delete this {entityLabel.toLowerCase()}? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

export function CrudFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  mode,
  entityLabel,
  fields,
  schema,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
  mode: "create" | "edit";
  entityLabel: string;
  fields: CrudField[];
  schema: AnyZodObject;
  defaultValues: Record<string, unknown>;
}) {
  const dark = useThemeStore((s) => s.dark);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${mode === "create" ? "Add" : "Edit"} ${entityLabel}`}
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
            form="crud-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
      maxWidth="max-w-xl"
    >
      <form id="crud-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className={labelClass}>
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea {...register(field.name)} className={inputClass} rows={3} placeholder={field.placeholder} />
            ) : field.type === "select" ? (
              <select {...register(field.name)} className={inputClass}>
                <option value="">None</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register(field.name)} className="h-4 w-4 rounded border-gray-300" />
                <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  {field.help ?? field.label}
                </span>
              </label>
            ) : field.type === "color" ? (
              <input type="color" {...register(field.name)} className="h-10 w-full cursor-pointer rounded-md border" />
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                step={field.type === "number" ? "1" : undefined}
                {...register(field.name, field.type === "number" ? { valueAsNumber: true } : {})}
                className={inputClass}
                placeholder={field.placeholder}
              />
            )}
            {errors[field.name] && (
              <p className="mt-1 text-xs text-red-600">
                {errors[field.name]?.message as string}
              </p>
            )}
          </div>
        ))}
      </form>
    </Modal>
  );
}