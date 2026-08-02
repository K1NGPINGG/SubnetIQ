import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useAggregates,
  useCreateAggregate,
  useUpdateAggregate,
  useDeleteAggregate,
  useRirs,
} from "@/hooks/api";
import { aggregateCreateSchema, aggregateUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { Aggregate } from "@/types/api";

const col = createColumnHelper<Aggregate>();

export default function AggregatesPage() {
  const dark = useThemeStore((s) => s.dark);
  const { data: rirs = [] } = useRirs();

  const rirName = (id: string | null) => rirs.find((r) => r.id === id)?.name ?? "—";

  const columns = [
    col.accessor("network_address", {
      header: "Network",
      cell: (info) => (
        <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          {info.getValue()}/{info.row.original.prefix_length}
        </span>
      ),
    }),
    col.accessor("family", {
      header: "Family",
      cell: (info) => (
        <Badge variant="info">IPv{info.getValue()}</Badge>
      ),
    }),
    col.accessor("rir_id", {
      header: "RIR",
      cell: (info) => rirName(info.getValue()),
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
      entityLabel="Aggregate"
      searchPlaceholder="Search aggregates..."
      fields={[
        { name: "network_address", label: "Network Address", required: true, placeholder: "10.0.0.0" },
        {
          name: "prefix_length",
          label: "Prefix Length",
          type: "number",
          required: true,
          placeholder: "16",
        },
        {
          name: "rir_id",
          label: "RIR",
          type: "select",
          options: rirs.map((r) => ({ value: r.id, label: r.name })),
        },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      createSchema={aggregateCreateSchema}
      updateSchema={aggregateUpdateSchema}
      emptyCreate={() => ({ network_address: "", prefix_length: 24, rir_id: "", description: "" })}
      toFormValues={(a) => ({
        description: a.description ?? "",
        rir_id: a.rir_id ?? "",
      })}
      columns={columns}
      useList={useAggregates}
      useCreate={useCreateAggregate}
      useUpdate={useUpdateAggregate}
      useDelete={useDeleteAggregate}
    />
  );
}