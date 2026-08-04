import { useState } from "react";
import {
  Globe,
  CheckCircle,
  Clock,
  Network,
  ChevronDown,
  Activity,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDashboard, useRecentActivity } from "@/hooks/api";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/lib/theme-store";
import MapView from "@/components/map/MapView";
import type { AuditLogEntry } from "@/hooks/api";

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RecentActivityCard() {
  const dark = useThemeStore((s) => s.dark);
  const { data: activities = [] } = useRecentActivity(10);

  const actionMeta: Record<string, { icon: typeof Activity; color: string }> = {
    create: { icon: Plus, color: "text-emerald-500" },
    update: { icon: Pencil, color: "text-blue-500" },
    delete: { icon: Trash2, color: "text-red-500" },
    release: { icon: Clock, color: "text-amber-500" },
    allocate: { icon: CheckCircle, color: "text-emerald-500" },
    approve: { icon: CheckCircle, color: "text-emerald-500" },
    reject: { icon: X, color: "text-red-500" },
  };

  const cardClass = `rounded-lg border p-4 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`;

  return (
    <div className={cardClass}>
      <h3 className={`mb-4 text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
        Recent Activity
      </h3>
      {activities.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No recent activity
        </div>
      ) : (
        <div className="custom-scrollbar max-h-[300px] space-y-3 overflow-y-auto pr-1">
          {activities.map((log: AuditLogEntry) => {
            const meta = actionMeta[log.action] ?? { icon: Activity, color: "text-slate-500" };
            const Icon = meta.icon;
            const user = log.user_name ?? log.user_email ?? "System";
            return (
              <div key={log.id} className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-md p-1.5 ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>
                      <span className="capitalize">{log.action}</span> {log.entity_type}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(log.created_at)}</span>
                  </div>
                  <div className={`text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>{user}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const metricConfig = [
  {
    key: "total_ips" as const,
    label: "Total IPs",
    icon: Globe,
    bg: "bg-blue-50 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    key: "allocated_ips" as const,
    label: "Allocated",
    icon: CheckCircle,
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    key: "available_ips" as const,
    label: "Available",
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    key: "total_subnets" as const,
    label: "Subnets",
    icon: Network,
    bg: "bg-purple-50 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
];

const limitOptions = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
  { value: 0, label: "All" },
];

function getBarColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#3b82f6";
}

export default function DashboardPage() {
  const dark = useThemeStore((s) => s.dark);
  // Chart "Top N" dropdown (5/10/20/All)
  const [limit, setLimit] = useState(5);
  // Fetch all subnets once (limit=0) so the chart "All" option shows everything.
  const { data, isLoading } = useDashboard(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary;
  const topSubnets = data?.top_subnets_by_utilization ?? [];
  const totalIps = summary?.total_ips ?? 0;
  const allocatedIps = summary?.allocated_ips ?? 0;

  const chartData = limit === 0 ? topSubnets : topSubnets.slice(0, limit);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricConfig.map((m) => (
          <div
            key={m.key}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-4 shadow-sm",
              m.bg,
              m.borderColor
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg shadow-sm",
                dark ? "bg-gray-800" : "bg-white",
                m.iconColor
              )}
            >
              <m.icon className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>{m.label}</p>
              <p className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                {summary?.[m.key]?.toLocaleString() ?? "—"}
              </p>
              {m.key === "allocated_ips" && totalIps > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (allocatedIps / totalIps) * 100)}%` }}
                    />
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    {totalIps > 0 ? Math.round((allocatedIps / totalIps) * 100) : 0}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border p-4 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
        <h3 className={`mb-4 text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
          Site Locations
        </h3>
        <MapView />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`rounded-lg border p-4 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              Subnets by Utilization
            </h3>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className={`appearance-none rounded-md border py-1.5 pl-3 pr-8 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  dark
                    ? "border-gray-600 bg-gray-700 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {limitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#374151" : "#f1f5f9"} />
                <XAxis
                  dataKey="network"
                  tick={{ fontSize: 11, fill: dark ? "#9ca3af" : "#64748b" }}
                  stroke={dark ? "#4b5563" : "#94a3b8"}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: dark ? "#9ca3af" : "#64748b" }}
                  stroke={dark ? "#4b5563" : "#94a3b8"}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Used"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: `1px solid ${dark ? "#374151" : "#e2e8f0"}`,
                    backgroundColor: dark ? "#1f2937" : "#ffffff",
                    color: dark ? "#ffffff" : "#000000",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="utilization_pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={getBarColor(entry.utilization_pct)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              No subnet data available
            </div>
          )}
        </div>

        <RecentActivityCard />
      </div>
    </div>
  );
}
