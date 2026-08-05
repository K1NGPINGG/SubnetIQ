import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, XCircle, Clock, CheckCircle, AlertCircle, Ban, Play, Timer } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useDiscoveryScans,
  useCreateScan,
  useCancelScan,
  useDeleteScan,
  useRunScanNow,
  useSubnets,
  useSnmpCredentials,
} from "@/hooks/api";
import { discoveryScanCreateSchema } from "@/lib/validators";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";

import { Modal } from "@/components/ui/Modal";
import type { DiscoveryScan, DiscoveryScanCreate, Subnet } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";

const col = createColumnHelper<DiscoveryScan>();

const statusConfig: Record<string, { variant: "warning" | "info" | "success" | "danger" | "default"; icon: React.ElementType }> = {
  pending: { variant: "warning", icon: Clock },
  running: { variant: "info", icon: Clock },
  scheduled: { variant: "warning", icon: Timer },
  completed: { variant: "success", icon: CheckCircle },
  failed: { variant: "danger", icon: AlertCircle },
  cancelled: { variant: "default", icon: Ban },
};

export default function DiscoveryPage() {
  const dark = useThemeStore((s) => s.dark);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DiscoveryScan | null>(null);

  const { data = [], isLoading } = useDiscoveryScans();
  const { data: subnets = [] } = useSubnets();
  const { data: snmpCreds = [] } = useSnmpCredentials();
  const createMutation = useCreateScan();
  const cancelMutation = useCancelScan();
  const deleteMutation = useDeleteScan();
  const runNowMutation = useRunScanNow();

  const pageCount = Math.max(1, Math.ceil(data.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = data.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.accessor("subnet_id", {
      header: "Subnet",
      cell: (info) => {
        const subnet = subnets.find((s) => s.id === info.getValue());
        return subnet
          ? `${subnet.name} (${subnet.network_address}/${subnet.prefix_length})`
          : info.getValue();
      },
    }),
    col.accessor("scan_type", {
      header: "Scan Type",
      cell: (info) => (
        <Badge variant="info">{info.getValue().toUpperCase()}</Badge>
      ),
    }),
    col.accessor("is_scheduled", {
      header: "Schedule",
      cell: (info) => {
        const scan = info.row.original;
        if (!scan.is_scheduled) {
          return <Badge variant="default">One-time</Badge>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant="warning">Scheduled</Badge>
            {scan.schedule_time && (
              <span className="text-[10px] text-gray-400">
                {new Date(scan.schedule_time).toLocaleString()}
              </span>
            )}
            {scan.is_recursive && scan.interval_minutes && (
              <span className="text-[10px] text-gray-400">
                Every {scan.interval_minutes}min
              </span>
            )}
          </div>
        );
      },
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const cfg = statusConfig[info.getValue()] ?? statusConfig.pending;
        return (
          <Badge variant={cfg.variant}>
            {info.getValue()}
          </Badge>
        );
      },
    }),
    col.accessor("started_at", {
      header: "Started",
      cell: (info) =>
        info.getValue()
          ? new Date(info.getValue()!).toLocaleString()
          : "—",
    }),
    col.accessor("completed_at", {
      header: "Completed",
      cell: (info) =>
        info.getValue()
          ? new Date(info.getValue()!).toLocaleString()
          : "—",
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
          {info.row.original.is_scheduled && info.row.original.status !== "running" && (
            <button
              onClick={() => runNowMutation.mutate(info.row.original.id)}
              className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              <Play className="h-3 w-3" />
              Run Now
            </button>
          )}
          {info.row.original.status === "running" && (
            <button
              onClick={() => cancelMutation.mutate(info.row.original.id)}
              className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              <XCircle className="h-3 w-3" />
              Cancel
            </button>
          )}
                    <DeleteButton onClick={() => setDeleteItem(info.row.original)} />
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Scan
        </button>
      </div>

      <DataTable
        columns={columns}
        data={pagedData}
        pageCount={pageCount}
        pagination={{ ...pagination, pageIndex: safePageIndex }}
        onPaginationChange={setPagination}
        loading={isLoading}
      />

      {createOpen && (
        <Modal
          open
          onClose={() => setCreateOpen(false)}
          title="New Discovery Scan"
          footer={
            <>
              <button
                onClick={() => setCreateOpen(false)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="scan-form"
                disabled={createMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Starting..." : "Start Scan"}
              </button>
            </>
          }
        >
          <ScanForm
            subnets={subnets}
            snmpCreds={snmpCreds}
            onSubmit={(d) =>
              createMutation.mutate(d, {
                onSuccess: () => setCreateOpen(false),
              })
            }
          />
        </Modal>
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete Scan"
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
            Are you sure you want to delete this scan? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

function ScanForm({
  subnets,
  snmpCreds,
  onSubmit,
}: {
  subnets: Subnet[];
  snmpCreds: any[];
  onSubmit: (data: any) => void;
}) {
  const dark = useThemeStore((s) => s.dark);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
  } = useForm<DiscoveryScanCreate>({
    resolver: zodResolver(discoveryScanCreateSchema),
    defaultValues: {
      is_scheduled: false,
      is_recursive: false,
      schedule_preset: "off",
    },
  });

  const isScheduled = watch("is_scheduled");
  const schedulePreset = watch("schedule_preset");

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  const scheduleOptions = [
    { value: "off", label: "No schedule (one-time)" },
    { value: "daily", label: "Every day" },
    { value: "weekly", label: "Every week" },
    { value: "monthly", label: "Every month" },
    { value: "custom", label: "Custom interval" },
  ];

  const getPresetMinutes = (preset: string): number => {
    switch (preset) {
      case "daily": return 1440;
      case "weekly": return 10080;
      case "monthly": return 43200;
      default: return 0;
    }
  };

  const handlePresetChange = (preset: string) => {
    setValue("schedule_preset", preset);
    if (preset === "off") {
      setValue("is_scheduled", false);
      setValue("is_recursive", false);
      setValue("interval_minutes", null);
      setValue("schedule_time", null);
    } else if (preset === "custom") {
      setValue("is_scheduled", true);
      setValue("is_recursive", true);
      setValue("interval_minutes", null);
      if (!getValues("schedule_time")) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        now.setSeconds(0, 0);
        setValue("schedule_time", now.toISOString().slice(0, 16));
      }
    } else {
      setValue("is_scheduled", true);
      setValue("is_recursive", true);
      setValue("interval_minutes", getPresetMinutes(preset));
      if (!getValues("schedule_time")) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        now.setSeconds(0, 0);
        setValue("schedule_time", now.toISOString().slice(0, 16));
      }
    }
  };

  return (
    <form id="scan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={labelClass}>Subnet</label>
        <select {...register("subnet_id")} className={inputClass}>
          <option value="">Select subnet</option>
          {subnets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.network_address}/{s.prefix_length})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Scan Type</label>
        <select {...register("scan_type")} className={inputClass}>
          <option value="ping">Ping Sweep (ICMP)</option>
          <option value="snmp">SNMP Only</option>
          <option value="icmp_and_snmp">Ping + SNMP</option>
          <option value="arp">ARP</option>
          <option value="full">Full (All Methods)</option>
        </select>
      </div>
      {(watch("scan_type") === "snmp" || watch("scan_type") === "icmp_and_snmp") && (
        <div>
          <label className={labelClass}>SNMP Profile</label>
          <select {...register("snmp_credential_id")} className={inputClass}>
            <option value="">Default (public community)</option>
            {snmpCreds.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.version.toUpperCase()})
              </option>
            ))}
          </select>
          {snmpCreds.length === 0 && (
            <p className={`mt-1 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              No SNMP profiles configured. Add one in Admin &gt; SNMP Profiles.
            </p>
          )}
        </div>
      )}
      <div className="border-t pt-4" style={{ borderColor: dark ? "#374151" : "#e5e7eb" }}>
        <label className={labelClass}>Schedule</label>
        <div className="grid grid-cols-2 gap-2">
          {scheduleOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePresetChange(opt.value)}
              className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
                schedulePreset === opt.value
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : dark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {isScheduled && (
        <>
          <div>
            <label className={labelClass}>First Run At</label>
            <input
              type="datetime-local"
              {...register("schedule_time")}
              className={inputClass}
            />
          </div>
          {schedulePreset === "custom" && (
            <div>
              <label className={labelClass}>Repeat every (minutes)</label>
              <input
                type="number"
                {...register("interval_minutes", { valueAsNumber: true })}
                placeholder="60"
                min="1"
                className={inputClass}
              />
            </div>
          )}
          <div className={`rounded-md p-3 text-xs ${dark ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
            {schedulePreset === "daily" && "Scan will repeat every 24 hours"}
            {schedulePreset === "weekly" && "Scan will repeat every 7 days"}
            {schedulePreset === "monthly" && "Scan will repeat every 30 days"}
            {schedulePreset === "custom" && "Scan will repeat at your custom interval"}
          </div>
        </>
      )}
    </form>
  );
}
