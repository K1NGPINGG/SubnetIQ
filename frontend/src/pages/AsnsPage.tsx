import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useAsns,
  useCreateAsn,
  useUpdateAsn,
  useDeleteAsn,
  useRirs,
  useSites,
} from "@/hooks/api";
import { asnCreateSchema, asnUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { ASN } from "@/types/api";

const col = createColumnHelper<ASN>();

export default function AsnsPage() {
  const dark = useThemeStore((s) => s.dark);
  const { data: rirs = [] } = useRirs();
  const { data: sites = [] } = useSites();

  const rirName = (id: string | null) => rirs.find((r) => r.id === id)?.name ?? "—";
  const siteName = (id: string | null) => sites.find((s) => s.id === id)?.name ?? "—";

  const columns = [
    col.accessor("asn", {
      header: "ASN",
      cell: (info) => (
        <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          AS{info.getValue()}
        </span>
      ),
    }),
    col.accessor("is_32bit", {
      header: "Type",
      cell: (info) => (
        <Badge variant={info.getValue() ? "info" : "default"}>
          {info.getValue() ? "32-bit" : "16-bit"}
        </Badge>
      ),
    }),
    col.accessor("rir_id", {
      header: "RIR",
      cell: (info) => rirName(info.getValue()),
    }),
    col.accessor("site_id", {
      header: "Site",
      cell: (info) => siteName(info.getValue()),
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
  ];

  return (
    <CrudPage
      entityLabel="ASN"
      searchPlaceholder="Search ASNs..."
      fields={[
        { name: "asn", label: "AS Number", type: "number", required: true, placeholder: "64512" },
        {
          name: "rir_id",
          label: "RIR",
          type: "select",
          options: rirs.map((r) => ({ value: r.id, label: r.name })),
        },
        {
          name: "site_id",
          label: "Site",
          type: "select",
          options: sites.map((s) => ({ value: s.id, label: s.name })),
        },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      createSchema={asnCreateSchema}
      updateSchema={asnUpdateSchema}
      emptyCreate={() => ({ asn: 64512, rir_id: "", site_id: "", description: "" })}
      toFormValues={(a) => ({
        rir_id: a.rir_id ?? "",
        site_id: a.site_id ?? "",
        description: a.description ?? "",
      })}
      columns={columns}
      useList={useAsns}
      useCreate={useCreateAsn}
      useUpdate={useUpdateAsn}
      useDelete={useDeleteAsn}
    />
  );
}