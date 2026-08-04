import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Search,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  WifiOff,
  Tag as TagIcon,
  Check,
  Edit,
  Layers,
  Plus,
  X,
} from "lucide-react";
import {
  useIpamRecords,
  useCustomFields,
  useTags,
  useUpdateIp,
  useSubnets,
  useVrfs,
} from "@/hooks/api";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EditButton } from "@/components/ui/EditButton";
import { Modal } from "@/components/ui/Modal";
import { useThemeStore } from "@/shared/lib/theme-store";
import apiClient from "@/shared/lib/api-client";
import type { IPAddress, CustomField, Tag, IPAddressUpdate, Subnet, VRF } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const col = createColumnHelper<IPAddress>();

const statusVariant: Record<string, "success" | "warning" | "info" | "default" | "danger"> = {
  allocated: "success",
  reserved: "warning",
  available: "info",
  unavailable: "danger",
  unused: "default",
};

function formatCustomFields(ip: IPAddress, fields: CustomField[]): string {
  if (!ip.custom_fields || typeof ip.custom_fields !== "object") return "";
  const entries = Object.entries(ip.custom_fields).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => {
      const def = fields.find((f) => f.name === key);
      const label = def?.label || def?.name || key;
      return `${label}: ${String(value)}`;
    })
    .join(" · ");
}

export default function IpamRecordsPage() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const { data = [], isLoading, refetch, isFetching } = useIpamRecords();
  const { data: customFields = [] } = useCustomFields();
  const { data: tags = [] } = useTags();
  const { data: subnets = [] } = useSubnets();
  const { data: vrfs = [] } = useVrfs();
  const updateMutation = useUpdateIp();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<IPAddress | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const tagMap = useMemo(() => {
    const map: Record<string, Tag> = {};
    for (const t of tags) map[t.slug] = t;
    return map;
  }, [tags]);

  const filtered = useMemo(() => {
    return data.filter((ip) => {
      const matchesSearch =
        !search ||
        ip.address.toLowerCase().includes(search.toLowerCase()) ||
        (ip.hostname ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (ip.device_type ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (ip.assigned_to ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (ip.vrf_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (ip.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = !statusFilter || ip.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.display({
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(new Set(filtered.map((ip) => ip.id)));
            } else {
              setSelectedIds(new Set());
            }
          }}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(ip.id)}
            onChange={(e) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(ip.id);
                else next.delete(ip.id);
                return next;
              });
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );
      },
    }),
    col.accessor("address", {
      header: "IP Address",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono font-medium ${dark ? "text-white" : "text-gray-900"}`}>
              {info.getValue()}
            </span>
            {ip.is_vip && (
              <span
                title={`Virtual IP (${ip.vip_type ?? "unknown"})`}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  dark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"
                }`}
              >
                <Layers className="h-3 w-3" />
                VIP
              </span>
            )}
          </div>
        );
      },
    }),
    col.accessor("hostname", {
      header: "Hostname",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const val = info.getValue() as string;
        return <Badge variant={statusVariant[val] ?? "default"}>{val}</Badge>;
      },
    }),
    col.accessor("device_type", {
      header: "Device Type",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("vip_type" as any, {
      header: "VIP",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        if (!ip.is_vip) return "—";
        return (
          <div className="space-y-1">
            <Badge variant="default">{ip.vip_type ?? "VIP"}</Badge>
            {ip.node_bindings && ip.node_bindings.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ip.node_bindings.map((b) => (
                  <span
                    key={b.id ?? b.node_ip_id}
                    title={`${b.role ?? "node"}: ${b.node_ip_address ?? b.node_ip_id}`}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                      dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span className={`font-sans font-semibold ${dark ? "text-purple-300" : "text-purple-700"}`}>
                      {b.role ?? "node"}
                    </span>
                    {b.node_ip_address ?? b.node_ip_id}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    }),
    col.accessor("subnet_cidr", {
      header: "Subnet",
      cell: (info) => {
        const cidr = info.getValue();
        if (cidr) {
          return <span className={`text-xs ${dark ? "text-gray-300" : "text-gray-600"}`}>{cidr}</span>;
        }
        return "—";
      },
    }),
    col.accessor("vrf_name", {
      header: "VRF",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("mac_address", {
      header: "MAC Address",
      cell: (info) =>
        info.getValue() ? (
          <span className={`font-mono text-xs ${dark ? "text-gray-300" : "text-gray-600"}`}>
            {info.getValue()}
          </span>
        ) : (
          "—"
        ),
    }),
    col.accessor("assigned_to", {
      header: "Assigned To",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.display({
      id: "tags",
      header: "Tags",
      cell: (info) => {
        const ip = info.row.original;
        const ipTags = (ip.tags ?? []).filter(Boolean);
        if (ipTags.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {ipTags.map((slug) => {
              const tag = tagMap[slug];
              const name = tag?.name ?? slug;
              const color = tag?.color ?? "#1976D2";
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  <TagIcon className="h-3 w-3" />
                  {name}
                </span>
              );
            })}
          </div>
        );
      },
    }),
    col.display({
      id: "custom_fields",
      header: "Custom Fields",
      cell: (info) => {
        const value = formatCustomFields(info.row.original, customFields);
        return value ? (
          <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`} title={value}>
            {value}
          </span>
        ) : (
          "—"
        );
      },
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "—";
        return (
          <span
            className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
            title={val}
          >
            {val.length > 40 ? val.slice(0, 40) + "..." : val}
          </span>
        );
      },
    }),
    col.accessor("created_at" as any, {
      header: "Created",
      cell: (info) => (
        <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const ip = info.row.original as IPAddress;
        return (
                    <EditButton onClick={() => setEditItem(ip)} />
        );
      },
    }),
  ];

  const exportCSV = () => {
    const headers = [
      "IP Address",
      "Hostname",
      "Status",
      "Device Type",
      "Subnet",
      "VRF",
      "MAC Address",
      "Assigned To",
      "Tags",
      "Custom Fields",
      "Description",
      "Created",
    ];
    const rows = filtered.map((ip) => [
      ip.address,
      ip.hostname ?? "",
      ip.status,
      ip.device_type ?? "",
      ip.subnet_cidr ?? "",
      ip.vrf_name ?? "",
      ip.mac_address ?? "",
      ip.assigned_to ?? "",
      (ip.tags ?? []).map((t) => tagMap[t]?.name ?? t).join(", "),
      formatCustomFields(ip, customFields),
      ip.description ?? "",
      ip.created_at ? new Date(ip.created_at).toISOString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipam-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("IPAM Records", 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleString()} · ${filtered.length} records${statusFilter ? ` · status: ${statusFilter}` : ""}${search ? ` · search: "${search}"` : ""}`,
      14,
      22
    );
    autoTable(doc, {
      startY: 28,
      head: [
        [
          "IP Address",
          "Hostname",
          "Status",
          "Device Type",
          "Subnet",
          "VRF",
          "MAC",
          "Assigned To",
          "Tags",
          "Custom Fields",
          "Description",
        ],
      ],
      body: filtered.map((ip) => [
        ip.address,
        ip.hostname ?? "",
        ip.status,
        ip.device_type ?? "",
        ip.subnet_cidr ?? "",
        ip.vrf_name ?? "",
        ip.mac_address ?? "",
        ip.assigned_to ?? "",
        (ip.tags ?? []).map((t) => tagMap[t]?.name ?? t).join(", "),
        formatCustomFields(ip, customFields),
        ip.description ?? "",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 235], fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    doc.save(`ipam-records-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const inputClass = `rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white" : "border-gray-300"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Search IP, hostname, tags..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          className={inputClass}
        >
          <option value="">All Status</option>
          <option value="allocated">Allocated</option>
          <option value="reserved">Reserved</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="unused">Unused</option>
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={exportPDF}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => refetch()}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
          <div className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
            <strong className="font-semibold">{filtered.length}</strong> record{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className={`${dark ? "text-emerald-400" : "text-emerald-700"}`}>
                {filtered.filter((ip) => ip.status === "allocated").length} allocated
              </span>
              <span className={`${dark ? "text-amber-400" : "text-amber-700"}`}>
                {filtered.filter((ip) => ip.status === "reserved").length} reserved
              </span>
              <span className={`${dark ? "text-blue-400" : "text-blue-700"}`}>
                {filtered.filter((ip) => ip.status === "available").length} available
              </span>
            </div>
          )}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${dark ? "border-blue-800 bg-blue-900/30" : "border-blue-200 bg-blue-50"}`}>
          <span className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-800"}`}>
            {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setBulkEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Edit className="h-3.5 w-3.5" />
            Bulk Edit
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className={`text-xs ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}
          >
            Clear selection
          </button>
        </div>
      )}

      {filtered.length === 0 && !isLoading ? (
        <div className={`rounded-lg border border-dashed p-12 text-center ${dark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-white"}`}>
          <WifiOff className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-4 text-lg font-medium ${dark ? "text-white" : "text-gray-900"}`}>
            No IP records found
          </h3>
          <p className={`mt-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Add IP addresses via the IP Addresses page, or run a discovery scan to import live hosts.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pagedData}
          pageCount={pageCount}
          pagination={{ ...pagination, pageIndex: safePageIndex }}
          onPaginationChange={setPagination}
          loading={isLoading}
        />
      )}

      {editItem && (
        <EditIpModal
          ip={editItem}
          subnets={subnets}
          vrfs={vrfs}
          tags={tags}
          allIps={data}
          customFields={customFields.filter((f) =>
            (f.applies_to || "").split(",").map((s) => s.trim()).includes("ip_address")
          )}
          loading={updateMutation.isPending}
          onSubmit={(data) =>
            updateMutation.mutate(
              { id: editItem.id, data },
              { onSuccess: () => setEditItem(null) }
            )
          }
          onClose={() => setEditItem(null)}
        />
      )}

      {bulkEditOpen && (
        <BulkEditIpModal
          selectedIds={Array.from(selectedIds)}
          tags={tags}
          onClose={() => setBulkEditOpen(false)}
          onComplete={() => {
            setBulkEditOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}

const inputCls = (dark: boolean) =>
  `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;

const labelCls = (dark: boolean) =>
  `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

function CustomFieldsEditor({
  values,
  fields,
  dark,
  onChange,
}: {
  values: Record<string, unknown>;
  fields: CustomField[];
  dark: boolean;
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (fields.length === 0) {
    return (
      <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
        No custom fields defined for IP addresses.
      </p>
    );
  }

  const set = (name: string, value: unknown) => {
    const next = { ...values };
    if (value === "" || value === null || value === undefined) {
      delete next[name];
    } else {
      next[name] = value;
    }
    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => {
        const raw = values[field.name];
        const label = field.label || field.name;
        const key = `cf-${field.name}`;
        if (field.field_type === "boolean") {
          return (
            <div key={key}>
              <label className={labelCls(dark)}>{label}</label>
              <select
                value={raw == null ? "" : String(raw)}
                onChange={(e) =>
                  set(field.name, e.target.value === "" ? null : e.target.value === "true")
                }
                className={inputCls(dark)}
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          );
        }
        if (field.field_type === "select") {
          return (
            <div key={key}>
              <label className={labelCls(dark)}>{label}</label>
              <select
                value={raw == null ? "" : String(raw)}
                onChange={(e) => set(field.name, e.target.value || null)}
                className={inputCls(dark)}
              >
                <option value="">—</option>
                {(field.choices ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (field.field_type === "date") {
          return (
            <div key={key}>
              <label className={labelCls(dark)}>{label}</label>
              <input
                type="date"
                value={raw == null ? "" : String(raw)}
                onChange={(e) => set(field.name, e.target.value || null)}
                className={inputCls(dark)}
              />
            </div>
          );
        }
        if (field.field_type === "integer" || field.field_type === "float") {
          return (
            <div key={key}>
              <label className={labelCls(dark)}>{label}</label>
              <input
                type="number"
                step={field.field_type === "float" ? "any" : "1"}
                value={raw == null ? "" : String(raw)}
                onChange={(e) => set(field.name, e.target.value === "" ? null : e.target.value)}
                className={inputCls(dark)}
              />
            </div>
          );
        }
        return (
          <div key={key}>
            <label className={labelCls(dark)}>{label}</label>
            <input
              type="text"
              value={raw == null ? "" : String(raw)}
              onChange={(e) => set(field.name, e.target.value || null)}
              className={inputCls(dark)}
            />
          </div>
        );
      })}
    </div>
  );
}

function TagSelector({
  selected,
  tags,
  dark,
  onChange,
}: {
  selected: string[];
  tags: Tag[];
  dark: boolean;
  onChange: (next: string[]) => void;
}) {
  const toggle = (slug: string) => {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.length === 0 && (
        <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
          No tags defined. Create them under Admin &gt; Tags.
        </span>
      )}
      {tags.map((tag) => {
        const active = selected.includes(tag.slug);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.slug)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? tag.color : "transparent",
              color: active ? "#fff" : dark ? "#d1d5db" : "#374151",
              border: `1px solid ${active ? tag.color : dark ? "#4b5563" : "#d1d5db"}`,
            }}
          >
            {active && <Check className="h-3 w-3" />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

function EditIpModal({
  ip,
  subnets,
  vrfs,
  tags,
  allIps = [],
  customFields,
  loading,
  onSubmit,
  onClose,
}: {
  ip: IPAddress;
  subnets: Subnet[];
  vrfs: VRF[];
  tags: Tag[];
  allIps?: IPAddress[];
  customFields: CustomField[];
  loading: boolean;
  onSubmit: (data: IPAddressUpdate) => void;
  onClose: () => void;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [form, setForm] = useState<{
    hostname: string;
    status: string;
    mac_address: string;
    device_type: string;
    description: string;
    assigned_to: string;
    subnet_id: string;
    vrf_id: string;
  }>({
    hostname: ip.hostname ?? "",
    status: ip.status,
    mac_address: ip.mac_address ?? "",
    device_type: ip.device_type ?? "",
    description: ip.description ?? "",
    assigned_to: ip.assigned_to ?? "",
    subnet_id: ip.subnet_id,
    vrf_id: ip.vrf_id ?? "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(ip.tags ?? []);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(
    ip.custom_fields ?? {}
  );

  const [isVip, setIsVip] = useState<boolean>(ip.is_vip ?? false);
  const [vipType, setVipType] = useState<string>(ip.vip_type ?? "");
  const [nodeBindings, setNodeBindings] = useState<
    { node_ip_id: string; role: string }[]
  >(
    (ip.node_bindings ?? []).map((b) => ({
      node_ip_id: b.node_ip_id,
      role: b.role ?? "primary",
    }))
  );
  const [vipError, setVipError] = useState("");

  const nodeCandidates = allIps.filter((i) => i.id !== ip.id);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateNode = (idx: number, field: "node_ip_id" | "role", value: string) =>
    setNodeBindings((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));

  const handleSubmit = () => {
    const data: IPAddressUpdate = {
      hostname: form.hostname || null,
      status: form.status,
      mac_address: form.mac_address || null,
      device_type: form.device_type || null,
      description: form.description || null,
      assigned_to: form.assigned_to || null,
      tags: selectedTags,
      custom_fields: customValues,
    };
    if (form.subnet_id) data.subnet_id = form.subnet_id;
    if (form.vrf_id) data.vrf_id = form.vrf_id;
    else data.vrf_id = null;

    if (isVip) {
      if (!vipType) {
        setVipError("VIP type is required for VIP addresses");
        return;
      }
      data.is_vip = true;
      data.vip_type = vipType as IPAddressUpdate["vip_type"];
      data.node_bindings = nodeBindings
        .filter((b) => b.node_ip_id)
        .map((b) => ({
          node_ip_id: b.node_ip_id,
          role: b.role as "primary" | "backup" | "active" | "standby",
        }));
    } else {
      data.is_vip = false;
      data.vip_type = null;
      data.node_bindings = [];
    }

    onSubmit(data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit IPAM Record — ${ip.address}`}
      maxWidth="max-w-2xl"
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
            form="edit-ip-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form
        id="edit-ip-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls(dark)}>IP Address</label>
            <input value={ip.address} disabled className={`${inputCls(dark)} opacity-60`} />
          </div>
          <div>
            <label className={labelCls(dark)}>Status</label>
            <select value={form.status} onChange={set("status")} className={inputCls(dark)}>
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="reserved">Reserved</option>
              <option value="unavailable">Unavailable</option>
              <option value="unused">Unused</option>
            </select>
          </div>
          <div>
            <label className={labelCls(dark)}>Hostname</label>
            <input value={form.hostname} onChange={set("hostname")} className={inputCls(dark)} />
          </div>
          <div>
            <label className={labelCls(dark)}>Device Type</label>
            <input value={form.device_type} onChange={set("device_type")} className={inputCls(dark)} />
          </div>
          <div>
            <label className={labelCls(dark)}>MAC Address</label>
            <input
              value={form.mac_address}
              onChange={set("mac_address")}
              placeholder="AA:BB:CC:DD:EE:FF"
              className={inputCls(dark)}
            />
          </div>
          <div>
            <label className={labelCls(dark)}>Assigned To</label>
            <input value={form.assigned_to} onChange={set("assigned_to")} className={inputCls(dark)} />
          </div>
          <div>
            <label className={labelCls(dark)}>Subnet</label>
            <select value={form.subnet_id} onChange={set("subnet_id")} className={inputCls(dark)}>
              {subnets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.network_address}/{s.prefix_length})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls(dark)}>VRF</label>
            <select value={form.vrf_id} onChange={set("vrf_id")} className={inputCls(dark)}>
              <option value="">None</option>
              {vrfs.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`rounded-md border p-3 ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isVip}
              onChange={(e) => {
                setIsVip(e.target.checked);
                if (!e.target.checked) setNodeBindings([]);
              }}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${dark ? "text-gray-200" : "text-gray-800"}`}>
              <Layers className="h-4 w-4 text-purple-500" />
              Virtual IP (VIP)
            </span>
          </label>

          {isVip && (
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelCls(dark)}>VIP Type</label>
                <select
                  value={vipType}
                  onChange={(e) => {
                    setVipType(e.target.value);
                    setVipError("");
                  }}
                  className={inputCls(dark)}
                >
                  <option value="">Select VIP type</option>
                  {["keepalived", "carp_vrrp", "load_balancer", "kubernetes", "floating_cloud"].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
                {vipError && <p className="mt-1 text-xs text-red-600">{vipError}</p>}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={labelCls(dark)}>Backing Node IPs</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNodeBindings((prev) => [...prev, { node_ip_id: "", role: "primary" }])
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add node
                  </button>
                </div>
                {nodeBindings.length === 0 && (
                  <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    No backing nodes assigned.
                  </p>
                )}
                <div className="space-y-2">
                  {nodeBindings.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={b.node_ip_id}
                        onChange={(e) => updateNode(idx, "node_ip_id", e.target.value)}
                        className={inputCls(dark)}
                      >
                        <option value="">Select node IP</option>
                        {nodeCandidates.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.address}
                            {i.hostname ? ` (${i.hostname})` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        value={b.role}
                        onChange={(e) => updateNode(idx, "role", e.target.value)}
                        className={`${inputCls(dark)} w-28 shrink-0`}
                      >
                        {["primary", "backup", "active", "standby"].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setNodeBindings((prev) => prev.filter((_, i) => i !== idx))}
                        className={`shrink-0 rounded p-1.5 ${dark ? "text-gray-400 hover:bg-gray-700 hover:text-red-400" : "text-gray-400 hover:bg-gray-100 hover:text-red-600"}`}
                        title="Remove node"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls(dark)}>Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={2}
            className={inputCls(dark)}
          />
        </div>

        <div>
          <label className={labelCls(dark)}>Tags</label>
          <TagSelector selected={selectedTags} tags={tags} dark={dark} onChange={setSelectedTags} />
        </div>

        <div>
          <label className={labelCls(dark)}>Custom Fields</label>
          <CustomFieldsEditor
            values={customValues}
            fields={customFields}
            dark={dark}
            onChange={setCustomValues}
          />
        </div>
      </form>
    </Modal>
  );
}

function BulkEditIpModal({
  selectedIds,
  tags,
  onClose,
  onComplete,
}: {
  selectedIds: string[];
  tags: Tag[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const dark = useThemeStore((s) => s.dark);
  const updateMutation = useUpdateIp();
  const [status, setStatus] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [tagMode, setTagMode] = useState<"none" | "add" | "replace" | "remove">("none");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: selectedIds.length });

  const hasChanges = !!status || !!deviceType || !!assignedTo || tagMode !== "none";

  const handleSubmit = async () => {
    if (!hasChanges) return;
    setSaving(true);
    let done = 0;
    for (const id of selectedIds) {
      const data: IPAddressUpdate = {};
      if (status) data.status = status;
      if (deviceType) data.device_type = deviceType;
      if (assignedTo) data.assigned_to = assignedTo;
      if (tagMode !== "none") {
        try {
          const res = await apiClient.get<IPAddress>(`/ips/${id}`);
          const current = res.data.tags ?? [];
          if (tagMode === "add") {
            data.tags = [...new Set([...current, ...selectedTags])];
          } else if (tagMode === "replace") {
            data.tags = selectedTags;
          } else {
            data.tags = current.filter((t) => !selectedTags.includes(t));
          }
        } catch {
          continue;
        }
      }
      try {
        await updateMutation.mutateAsync({ id, data });
      } catch {}
      done++;
      setProgress({ done, total: selectedIds.length });
    }
    onComplete();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Bulk Edit ${selectedIds.length} Record${selectedIds.length !== 1 ? "s" : ""}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !hasChanges}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? `Applying... ${progress.done}/${progress.total}` : "Apply Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Changes will be applied to all {selectedIds.length} selected records.
        </p>
        <div>
          <label className={labelCls(dark)}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls(dark)}
          >
            <option value="">— No change —</option>
            <option value="allocated">Allocated</option>
            <option value="reserved">Reserved</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="unused">Unused</option>
          </select>
        </div>
        <div>
          <label className={labelCls(dark)}>Device Type</label>
          <input
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            placeholder="Leave empty to keep unchanged"
            className={inputCls(dark)}
          />
        </div>
        <div>
          <label className={labelCls(dark)}>Assigned To</label>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Leave empty to keep unchanged"
            className={inputCls(dark)}
          />
        </div>
        <div>
          <label className={labelCls(dark)}>Tags</label>
          <select
            value={tagMode}
            onChange={(e) => setTagMode(e.target.value as any)}
            className={inputCls(dark)}
          >
            <option value="none">— No change —</option>
            <option value="add">Add selected tags</option>
            <option value="replace">Replace all tags</option>
            <option value="remove">Remove selected tags</option>
          </select>
          {tagMode !== "none" && (
            <div className="mt-3">
              <TagSelector
                selected={selectedTags}
                tags={tags}
                dark={dark}
                onChange={setSelectedTags}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
