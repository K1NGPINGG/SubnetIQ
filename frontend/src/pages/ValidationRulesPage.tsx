import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useValidationRules,
  useCreateValidationRule,
  useUpdateValidationRule,
  useDeleteValidationRule,
} from "@/hooks/api";
import { validationRuleCreateSchema, validationRuleUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { ValidationRule } from "@/types/api";

const col = createColumnHelper<ValidationRule>();

export default function ValidationRulesPage() {
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
    col.accessor("entity_type", {
      header: "Entity",
      cell: (info) => <Badge variant="info">{info.getValue()}</Badge>,
    }),
    col.accessor("enabled", {
      header: "Enabled",
      cell: (info) => (
        <Badge variant={info.getValue() ? "success" : "default"}>
          {info.getValue() ? "Yes" : "No"}
        </Badge>
      ),
    }),
    col.accessor("weight", { header: "Weight" }),
    col.accessor("error_message", {
      header: "Error Message",
      cell: (info) => (
        <span className="max-w-md truncate" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
    }),
  ];

  return (
    <div>
      <p className={`mb-4 text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Validation rules enforce policy at creation time — e.g. restricting IPs to RFC1918 ranges or forcing
        subnets into declared allocation blocks. Violating entities are rejected with a clear error.
      </p>
      <CrudPage
        entityLabel="Validation Rule"
        searchPlaceholder="Search validation rules..."
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "RFC1918 only" },
          {
            name: "entity_type",
            label: "Entity Type",
            type: "select",
            required: true,
            options: [
              { value: "ip_address", label: "IP Address" },
              { value: "subnet", label: "Subnet" },
            ],
          },
          { name: "error_message", label: "Error Message", required: true, placeholder: "IP is not in a private range" },
          { name: "weight", label: "Weight", type: "number", placeholder: "100" },
          {
            name: "enabled",
            label: "Enabled",
            type: "checkbox",
            help: "Enabled",
          },
          {
            name: "enforce_on_delete",
            label: "Enforce on delete",
            type: "checkbox",
            help: "Also enforce during deletion",
          },
        ]}
        createSchema={validationRuleCreateSchema}
        updateSchema={validationRuleUpdateSchema}
        emptyCreate={() => ({
          name: "",
          entity_type: "ip_address",
          condition: null,
          error_message: "",
          enabled: true,
          enforce_on_delete: false,
          weight: 100,
        })}
        toFormValues={(r) => ({
          name: r.name,
          entity_type: r.entity_type,
          condition: r.condition ?? null,
          error_message: r.error_message,
          enabled: r.enabled,
          enforce_on_delete: r.enforce_on_delete,
          weight: r.weight,
        })}
        columns={columns}
        useList={useValidationRules}
        useCreate={useCreateValidationRule}
        useUpdate={useUpdateValidationRule}
        useDelete={useDeleteValidationRule}
      />
    </div>
  );
}