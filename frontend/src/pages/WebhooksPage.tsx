import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { Badge } from "@/components/ui/Badge";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
} from "@/hooks/api";
import { webhookCreateSchema, webhookUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { Webhook } from "@/types/api";

const col = createColumnHelper<Webhook>();

export default function WebhooksPage() {
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
    col.accessor("url", {
      header: "URL",
      cell: (info) => (
        <span className="max-w-xs truncate font-mono text-xs" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("http_method", {
      header: "Method",
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
    col.accessor("last_status", {
      header: "Last Status",
      cell: (info) => {
        const status = info.getValue();
        if (status === null || status === undefined) return <span>—</span>;
        return (
          <Badge variant={status >= 200 && status < 300 ? "success" : "danger"}>
            {status}
          </Badge>
        );
      },
    }),
    col.accessor("events", {
      header: "Events",
      cell: (info) => {
        const events = info.getValue();
        if (!events || events.length === 0) return <Badge>All</Badge>;
        return (
          <span className="max-w-xs truncate text-xs" title={events.join(", ")}>
            {events.join(", ")}
          </span>
        );
      },
    }),
  ];

  return (
    <div>
      <p className={`mb-4 text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Webhooks notify external systems when IPAM events occur. Events follow the{" "}
        <code className="rounded bg-gray-700/50 px-1 py-0.5 text-xs">&lt;entity&gt;.&lt;action&gt;</code>{" "}
        pattern (e.g. <code>ip_address.create</code>). Use <code>*</code> to match all events.
      </p>
      <CrudPage
        entityLabel="Webhook"
        searchPlaceholder="Search webhooks..."
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Slack notifications" },
          { name: "url", label: "URL", required: true, placeholder: "https://hooks.example.com/..." },
          {
            name: "http_method",
            label: "HTTP Method",
            type: "select",
            options: [
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
              { value: "GET", label: "GET" },
            ],
          },
          { name: "secret", label: "Secret", placeholder: "HMAC signing secret" },
          { name: "events", label: "Events (comma separated)", placeholder: "ip_address.*, subnet.create" },
          { name: "timeout", label: "Timeout (s)", type: "number", placeholder: "5" },
          { name: "retry_count", label: "Retry Count", type: "number", placeholder: "3" },
          { name: "enabled", label: "Enabled", type: "checkbox", help: "Enabled" },
          { name: "ssl_verify", label: "Verify SSL", type: "checkbox", help: "Verify SSL certificate" },
        ]}
        createSchema={webhookCreateSchema}
        updateSchema={webhookUpdateSchema}
        emptyCreate={() => ({
          name: "",
          url: "",
          http_method: "POST",
          secret: "",
          events: [] as string[],
          enabled: true,
          ssl_verify: true,
          timeout: 5,
          retry_count: 3,
        })}
        toFormValues={(w) => ({
          name: w.name,
          url: w.url,
          http_method: w.http_method,
          secret: w.secret ?? "",
          events: (w.events ?? []).join(", "),
          enabled: w.enabled,
          ssl_verify: w.ssl_verify,
          timeout: w.timeout,
          retry_count: w.retry_count,
        })}
        columns={columns}
        useList={useWebhooks}
        useCreate={useCreateWebhook}
        useUpdate={useUpdateWebhook}
        useDelete={useDeleteWebhook}
        transformSubmit={(d) => {
          const events = typeof d.events === "string" && d.events.trim()
            ? d.events.split(",").map((s) => s.trim()).filter(Boolean)
            : null;
          const { events: _ev, ...rest } = d;
          return { ...rest, events };
        }}
      />
    </div>
  );
}