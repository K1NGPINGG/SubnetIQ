import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
} from "@/hooks/api";
import { customFieldCreateSchema, customFieldUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { CustomField } from "@/types/api";

const col = createColumnHelper<CustomField>();

const appliesToLabel: Record<string, string> = {
  subnet: "Subnet",
  ip_address: "IP Address",
  site: "Site",
};

export default function CustomFieldsPage() {
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
    col.accessor("applies_to", {
      header: "Applies To",
      cell: (info) => <Badge variant="info">{appliesToLabel[info.getValue()] ?? info.getValue()}</Badge>,
    }),
    col.accessor("field_type", {
      header: "Type",
      cell: (info) => <span className="capitalize">{info.getValue()}</span>,
    }),
    col.accessor("required", {
      header: "Required",
      cell: (info) => (
        <Badge variant={info.getValue() ? "warning" : "default"}>
          {info.getValue() ? "Yes" : "No"}
        </Badge>
      ),
    }),
    col.accessor("weight", { header: "Weight" }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
  ];

  return (
    <div>
      <p className={`mb-4 text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Custom fields attach extra attributes (owner, cost center, compliance data) to subnets, IP addresses, or sites.
      </p>
      <CrudPage
        entityLabel="Custom Field"
        searchPlaceholder="Search custom fields..."
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "owner" },
          { name: "label", label: "Label", placeholder: "Owner" },
          {
            name: "applies_to",
            label: "Applies To",
            type: "select",
            required: true,
            options: [
              { value: "subnet", label: "Subnet" },
              { value: "ip_address", label: "IP Address" },
              { value: "site", label: "Site" },
            ],
          },
          {
            name: "field_type",
            label: "Field Type",
            type: "select",
            options: [
              { value: "text", label: "Text" },
              { value: "number", label: "Number" },
              { value: "boolean", label: "Boolean" },
              { value: "date", label: "Date" },
            ],
          },
          {
            name: "required",
            label: "Required",
            type: "checkbox",
            help: "Required field",
          },
          { name: "default_value", label: "Default Value", placeholder: "Optional default" },
          { name: "weight", label: "Weight", type: "number", placeholder: "100" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        createSchema={customFieldCreateSchema}
        updateSchema={customFieldUpdateSchema}
        emptyCreate={() => ({
          name: "",
          label: "",
          applies_to: "ip_address",
          field_type: "text",
          required: false,
          default_value: "",
          weight: 100,
          description: "",
        })}
        toFormValues={(f) => ({
          name: f.name,
          label: f.label ?? "",
          applies_to: f.applies_to,
          field_type: f.field_type,
          required: f.required,
          default_value: f.default_value ?? "",
          weight: f.weight,
          description: f.description ?? "",
        })}
        columns={columns}
        useList={useCustomFields}
        useCreate={useCreateCustomField}
        useUpdate={useUpdateCustomField}
        useDelete={useDeleteCustomField}
      />
    </div>
  );
}