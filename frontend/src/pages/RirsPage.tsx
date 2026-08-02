import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { useRirs, useCreateRir, useUpdateRir, useDeleteRir } from "@/hooks/api";
import { rirCreateSchema, rirUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { RIR } from "@/types/api";

const col = createColumnHelper<RIR>();

export default function RirsPage() {
  const dark = useThemeStore((s) => s.dark);

  const columns = [
    col.accessor("name", {
      header: "Name",
      cell: (info) => (
        <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("slug", {
      header: "Slug",
      cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
  ];

  return (
    <CrudPage
      entityLabel="RIR"
      searchPlaceholder="Search RIRs..."
      fields={[
        { name: "name", label: "Name", required: true, placeholder: "RIPE NCC" },
        { name: "slug", label: "Slug", required: true, placeholder: "ripe" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      createSchema={rirCreateSchema}
      updateSchema={rirUpdateSchema}
      emptyCreate={() => ({ name: "", slug: "", description: "" })}
      toFormValues={(r) => ({
        name: r.name,
        slug: r.slug,
        description: r.description ?? "",
      })}
      columns={columns}
      useList={useRirs}
      useCreate={useCreateRir}
      useUpdate={useUpdateRir}
      useDelete={useDeleteRir}
    />
  );
}