import { useState } from "react";
import { Globe, CheckCircle, Clock, Network, ChevronDown } from "lucide-react";
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
import { useDashboard } from "@/hooks/api";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/lib/theme-store";
import MapView from "@/components/map/MapView";

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
  const [limit, setLimit] = useState(5);
  const { data, isLoading } = useDashboard(limit || undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary;
  const topSubnets = data?.top_subnets_by_utilization ?? [];

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
          {topSubnets.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSubnets}
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
                  {topSubnets.map((entry, idx) => (
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

        <div className={`rounded-lg border p-4 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
          <h3 className={`mb-4 text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
            Subnet Utilization
          </h3>
          <div className="space-y-3">
            {topSubnets.length > 0 ? (
              topSubnets.map((s) => (
                <div key={s.subnet_id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      {s.name}
                    </span>
                    <span className={dark ? "text-gray-400" : "text-gray-500"}>
                      {s.used}/{s.total_ips} ({s.utilization_pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`h-2 w-full overflow-hidden rounded-full ${dark ? "bg-gray-700" : "bg-gray-100"}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(s.utilization_pct, 100)}%`,
                        backgroundColor: getBarColor(s.utilization_pct),
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                No subnets to display
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
