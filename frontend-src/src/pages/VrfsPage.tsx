import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useVrfs,
  useCreateVrf,
  useUpdateVrf,
  useDeleteVrf,
} from "@/hooks/api";
import {
  vrfCreateSchema,
  vrfUpdateSchema,
} from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { VRF } from "@/types/api";

const col = createColumnHelper<VRF>();

export default function VrfsPage() {
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
    col.accessor("rd", {
      header: "RD",
      cell: (info) => (
        <span className="font-mono">{info.getValue() ?? "—"}</span>
      ),
    }),
    col.accessor("enforce_unique", {
      header: "Unique",
      cell: (info) => (
        <Badge variant={info.getValue() ? "info" : "default"}>
          {info.getValue() ? "Enforced" : "Off"}
        </Badge>
      ),
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
      entityLabel="VRF"
      searchPlaceholder="Search VRFs..."
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "rd", label: "Route Distinguisher", placeholder: "65000:1" },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "enforce_unique",
          label: "Enforce unique IPs within this VRF",
          type: "checkbox",
          help: "Enforce unique IPs across subnets in this VRF",
        },
      ]}
      createSchema={vrfCreateSchema}
      updateSchema={vrfUpdateSchema}
      emptyCreate={() => ({ name: "", rd: "", description: "", enforce_unique: true })}
      toFormValues={(v) => ({
        name: v.name,
        rd: v.rd ?? "",
        description: v.description ?? "",
        enforce_unique: v.enforce_unique,
      })}
      columns={columns}
      useList={useVrfs}
      useCreate={useCreateVrf}
      useUpdate={useUpdateVrf}
      useDelete={useDeleteVrf}
    />
  );
}