import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useIpRanges,
  useCreateIpRange,
  useUpdateIpRange,
  useDeleteIpRange,
  useSubnets,
} from "@/hooks/api";
import { ipRangeCreateSchema, ipRangeUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { IPRange } from "@/types/api";

const col = createColumnHelper<IPRange>();

export default function IpRangesPage() {
  const dark = useThemeStore((s) => s.dark);
  const { data: subnets = [] } = useSubnets();

  const subnetLabel = (id: string) =>
    subnets.find((s) => s.id === id)?.name ?? subnets.find((s) => s.id === id)?.network_address ?? "—";

  const statusVariant = (status: string) =>
    status === "active" ? "success" : status === "reserved" ? "warning" : "default";

  const columns = [
    col.accessor("start_address", {
      header: "Start",
      cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    col.accessor("end_address", {
      header: "End",
      cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    col.accessor("subnet_id", {
      header: "Subnet",
      cell: (info) => (
        <span className={dark ? "text-gray-300" : "text-gray-700"}>
          {subnetLabel(info.getValue())}
        </span>
      ),
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant={statusVariant(info.getValue())}>{info.getValue()}</Badge>
      ),
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
  ];

  return (
    <CrudPage
      entityLabel="IP Range"
      searchPlaceholder="Search IP ranges..."
      fields={[
        {
          name: "subnet_id",
          label: "Subnet",
          type: "select",
          required: true,
          options: subnets.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.network_address}/${s.prefix_length})`,
          })),
        },
        { name: "start_address", label: "Start Address", required: true, placeholder: "10.0.0.10" },
        { name: "end_address", label: "End Address", required: true, placeholder: "10.0.0.50" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "reserved", label: "Reserved" },
            { value: "deprecated", label: "Deprecated" },
          ],
        },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      createSchema={ipRangeCreateSchema}
      updateSchema={ipRangeUpdateSchema}
      emptyCreate={() => ({
        subnet_id: "",
        start_address: "",
        end_address: "",
        status: "active",
        description: "",
      })}
      toFormValues={(r) => ({
        start_address: r.start_address,
        end_address: r.end_address,
        status: r.status,
        description: r.description ?? "",
      })}
      columns={columns}
      useList={useIpRanges}
      useCreate={useCreateIpRange}
      useUpdate={useUpdateIpRange}
      useDelete={useDeleteIpRange}
    />
  );
}