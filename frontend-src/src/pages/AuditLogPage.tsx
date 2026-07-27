import { useState } from "react";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/shared/lib/api-client";
import { useAuditLogs, useAuditEntityTypes, useAuditActions, type AuditLogEntry } from "@/hooks/api";
import { Badge } from "@/components/ui/Badge";
import { Search, ChevronDown, ChevronRight, Download, X, Activity, AlertTriangle, AlertCircle, Info, Bug, Clock, Filter } from "lucide-react";

const actionColors: Record<string, "success" | "info" | "warning" | "danger"> = {
  create: "success",
  update: "info",
  delete: "danger",
};

const levelConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  info: { color: "text-blue-400", bg: "bg-blue-500/10", icon: Info },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertTriangle },
  error: { color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
  critical: { color: "text-red-500", bg: "bg-red-600/20", icon: Bug },
};

const categoryConfig: Record<string, string> = {
  api: "API",
  task: "Task",
  system: "System",
  discovery: "Discovery",
  auth: "Auth",
};

interface SystemLogEntry {
  id: string;
  level: string;
  category: string;
  message: string;
  details: string | null;
  source: string | null;
  entity_type: string | null;
  entity_id: string | null;
  task_id: string | null;
  duration_ms: number | null;
  ip_address: string | null;
  user_id: string | null;
  created_at: string | null;
}

interface SystemLogResponse {
  logs: SystemLogEntry[];
  total: number;
}

export default function AuditLogPage() {
  const dark = useThemeStore((s) => s.dark);
  const [activeTab, setActiveTab] = useState<"user" | "system">("system");

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className={cn("flex gap-1 rounded-lg p-1", dark ? "bg-gray-800" : "bg-gray-100")}>
        <button
          onClick={() => setActiveTab("system")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "system"
              ? dark ? "bg-gray-700 text-white" : "bg-white text-gray-900 shadow"
              : dark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-4 w-4" />
            System Logs
          </div>
        </button>
        <button
          onClick={() => setActiveTab("user")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "user"
              ? dark ? "bg-gray-700 text-white" : "bg-white text-gray-900 shadow"
              : dark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            User Actions
          </div>
        </button>
      </div>

      {activeTab === "system" ? <SystemLogsView /> : <UserActionsView />}
    </div>
  );
}

function SystemLogsView() {
  const dark = useThemeStore((s) => s.dark);
  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<SystemLogEntry | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useQuery<SystemLogResponse>({
    queryKey: ["system-logs", levelFilter, categoryFilter, sourceFilter, search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (levelFilter) params.set("level", levelFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (search) params.set("search", search);
      params.set("skip", String(page * pageSize));
      params.set("limit", String(pageSize));
      return apiClient.get(`/logs?${params}`).then((r) => r.data);
    },
  });

  const { data: levels = [] } = useQuery<string[]>({
    queryKey: ["system-log-levels"],
    queryFn: () => apiClient.get("/logs/levels").then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["system-log-categories"],
    queryFn: () => apiClient.get("/logs/categories").then((r) => r.data),
  });

  const { data: sources = [] } = useQuery<string[]>({
    queryKey: ["system-log-sources"],
    queryFn: () => apiClient.get("/logs/sources").then((r) => r.data),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCSV = () => {
    const headers = ["Time", "Level", "Category", "Source", "Message", "Entity Type", "Entity ID", "Duration (ms)", "IP Address", "Details"];
    const rows = logs.map((log) => [
      log.created_at ? new Date(log.created_at).toISOString() : "",
      log.level,
      log.category,
      log.source ?? "",
      log.message,
      log.entity_type ?? "",
      log.entity_id ?? "",
      log.duration_ms?.toString() ?? "",
      log.ip_address ?? "",
      log.details ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = cn(
    "rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    dark ? "border-gray-600 bg-gray-800 text-white" : "border-gray-300"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className={cn("w-full pl-9 pr-3", inputClass)}
          />
        </div>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(0); }} className={inputClass}>
          <option value="">All Levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} className={inputClass}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{categoryConfig[c] ?? c}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }} className={inputClass}>
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
          {total} entries
        </span>
        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className={cn("overflow-hidden rounded-lg border", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("border-b", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}>
                <th className={cn("w-8 px-2 py-3", dark ? "text-gray-400" : "text-gray-500")}></th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Time</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Level</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Category</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Source</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Message</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Duration</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", dark ? "divide-gray-700" : "divide-gray-100")}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const lvl = levelConfig[log.level] ?? levelConfig.info;
                  const LvlIcon = lvl.icon;
                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          dark ? "hover:bg-gray-700/50 text-gray-200" : "hover:bg-blue-50/50 text-gray-700"
                        )}
                      >
                        <td className="px-2 py-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </td>
                        <td className={cn("px-4 py-3 text-xs whitespace-nowrap", dark ? "text-gray-400" : "text-gray-500")}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${lvl.bg} ${lvl.color}`}>
                            <LvlIcon className="h-3 w-3" />
                            {log.level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{categoryConfig[log.category] ?? log.category}</Badge>
                        </td>
                        <td className={cn("px-4 py-3 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
                          {log.source ?? "—"}
                        </td>
                        <td className={cn("px-4 py-3 text-xs max-w-md truncate", dark ? "text-gray-300" : "text-gray-700")}>
                          {log.message}
                        </td>
                        <td className={cn("px-4 py-3 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
                          {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={7} className={cn("px-6 py-4", dark ? "bg-gray-900/50" : "bg-gray-50")}>
                            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 lg:grid-cols-4">
                              <DetailItem label="Message" value={log.message} dark={dark} />
                              {log.details && <DetailItem label="Details" value={log.details} dark={dark} />}
                              {log.entity_type && <DetailItem label="Entity Type" value={log.entity_type} dark={dark} />}
                              {log.entity_id && <DetailItem label="Entity ID" value={log.entity_id} dark={dark} mono />}
                              {log.task_id && <DetailItem label="Task ID" value={log.task_id} dark={dark} mono />}
                              {log.ip_address && <DetailItem label="IP Address" value={log.ip_address} dark={dark} />}
                              {log.user_id && <DetailItem label="User ID" value={log.user_id} dark={dark} mono />}
                              {log.duration_ms != null && <DetailItem label="Duration" value={`${log.duration_ms}ms`} dark={dark} />}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowDetail(log); }}
                              className={cn("mt-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                                dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                              )}
                            >
                              View Full Detail
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={cn("flex items-center justify-between border-t px-4 py-3", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}>
            <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", dark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100")}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", dark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100")}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={cn("mx-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border shadow-2xl", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
            <div className={cn("flex items-center justify-between border-b px-5 py-4", dark ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-base font-semibold", dark ? "text-white" : "text-gray-900")}>System Log Detail</h3>
              <button onClick={() => setShowDetail(null)} className={cn("rounded p-1", dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <DetailItem label="Timestamp" value={showDetail.created_at ? new Date(showDetail.created_at).toISOString() : "—"} dark={dark} />
              <DetailItem label="Level" value={showDetail.level.toUpperCase()} dark={dark} />
              <DetailItem label="Category" value={categoryConfig[showDetail.category] ?? showDetail.category} dark={dark} />
              <DetailItem label="Source" value={showDetail.source ?? "—"} dark={dark} />
              <DetailItem label="Message" value={showDetail.message} dark={dark} />
              {showDetail.details && <DetailItem label="Details" value={showDetail.details} dark={dark} />}
              {showDetail.entity_type && <DetailItem label="Entity Type" value={showDetail.entity_type} dark={dark} />}
              {showDetail.entity_id && <DetailItem label="Entity ID" value={showDetail.entity_id} dark={dark} mono />}
              {showDetail.task_id && <DetailItem label="Task ID" value={showDetail.task_id} dark={dark} mono />}
              {showDetail.ip_address && <DetailItem label="IP Address" value={showDetail.ip_address} dark={dark} />}
              {showDetail.user_id && <DetailItem label="User ID" value={showDetail.user_id} dark={dark} mono />}
              {showDetail.duration_ms != null && <DetailItem label="Duration" value={`${showDetail.duration_ms}ms`} dark={dark} />}
            </div>
            <div className={cn("border-t px-5 py-3", dark ? "border-gray-700" : "border-gray-200")}>
              <button
                onClick={() => setShowDetail(null)}
                className={cn("rounded-md border px-4 py-2 text-sm font-medium", dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserActionsView() {
  const dark = useThemeStore((s) => s.dark);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<AuditLogEntry | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useAuditLogs({
    entity_type: entityFilter || undefined,
    action: actionFilter || undefined,
    skip: page * pageSize,
    limit: pageSize,
  });

  const { data: entityTypes = [] } = useAuditEntityTypes();
  const { data: actions = [] } = useAuditActions();

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCSV = () => {
    const headers = ["Time", "Action", "Entity Type", "Entity ID", "New Value", "Old Value", "IP Address"];
    const rows = logs.map((log) => [
      log.created_at ? new Date(log.created_at).toISOString() : "",
      log.action,
      log.entity_type,
      log.entity_id ?? "",
      log.new_value ?? "",
      log.old_value ?? "",
      log.ip_address ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-actions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = cn(
    "rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    dark ? "border-gray-600 bg-gray-800 text-white" : "border-gray-300"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }} className={cn("pl-9", inputClass)}>
            <option value="">All Entities</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} className={inputClass}>
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
          {total} entries
        </span>
        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className={cn("overflow-hidden rounded-lg border", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("border-b", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}>
                <th className={cn("w-8 px-2 py-3", dark ? "text-gray-400" : "text-gray-500")}></th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Time</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Action</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Entity</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>User</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>Description</th>
                <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}>IP</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", dark ? "divide-gray-700" : "divide-gray-100")}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}>
                    No user actions found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          dark ? "hover:bg-gray-700/50 text-gray-200" : "hover:bg-blue-50/50 text-gray-700"
                        )}
                      >
                        <td className="px-2 py-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </td>
                        <td className={cn("px-4 py-3 text-xs whitespace-nowrap", dark ? "text-gray-400" : "text-gray-500")}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionColors[log.action] ?? "default"}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{log.entity_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            {log.user_name && <div className="font-medium">{log.user_name}</div>}
                            {log.user_email && <div className={cn(dark ? "text-gray-400" : "text-gray-500")}>{log.user_email}</div>}
                            {!log.user_name && !log.user_email && <span className={dark ? "text-gray-500" : "text-gray-400"}>—</span>}
                          </div>
                        </td>
                        <td className={cn("px-4 py-3 text-xs max-w-xs truncate", dark ? "text-gray-300" : "text-gray-700")}>
                          {log.new_value || log.old_value || "—"}
                        </td>
                        <td className={cn("px-4 py-3 text-xs", dark ? "text-gray-500" : "text-gray-400")}>
                          {log.ip_address || "—"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={7} className={cn("px-6 py-4", dark ? "bg-gray-900/50" : "bg-gray-50")}>
                            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                              <DetailItem label="Action" value={log.action} dark={dark} />
                              <DetailItem label="Entity" value={log.entity_type} dark={dark} />
                              <DetailItem label="Entity ID" value={log.entity_id ?? "—"} dark={dark} mono />
                              <DetailItem label="User" value={log.user_name ? `${log.user_name} (${log.user_email ?? "—"})` : log.user_email ?? log.user_id ?? "—"} dark={dark} />
                              <DetailItem label="New Value" value={log.new_value ?? "—"} dark={dark} />
                              <DetailItem label="Old Value" value={log.old_value ?? "—"} dark={dark} />
                              <DetailItem label="IP Address" value={log.ip_address ?? "—"} dark={dark} />
                              <DetailItem label="Timestamp" value={log.created_at ? new Date(log.created_at).toISOString() : "—"} dark={dark} />
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowDetail(log); }}
                              className={cn("mt-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                                dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                              )}
                            >
                              View Full Detail
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={cn("flex items-center justify-between border-t px-4 py-3", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}>
            <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", dark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100")}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed", dark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100")}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={cn("mx-4 w-full max-w-lg rounded-xl border shadow-2xl", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
            <div className={cn("flex items-center justify-between border-b px-5 py-4", dark ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-base font-semibold", dark ? "text-white" : "text-gray-900")}>Action Detail</h3>
              <button onClick={() => setShowDetail(null)} className={cn("rounded p-1", dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <DetailItem label="Timestamp" value={showDetail.created_at ? new Date(showDetail.created_at).toISOString() : "—"} dark={dark} />
              <DetailItem label="Action" value={showDetail.action} dark={dark} />
              <DetailItem label="Entity Type" value={showDetail.entity_type} dark={dark} />
              <DetailItem label="Entity ID" value={showDetail.entity_id ?? "—"} dark={dark} mono />
              <DetailItem label="New Value" value={showDetail.new_value ?? "—"} dark={dark} />
              <DetailItem label="Old Value" value={showDetail.old_value ?? "—"} dark={dark} />
              <DetailItem label="IP Address" value={showDetail.ip_address ?? "—"} dark={dark} />
              <DetailItem label="User" value={showDetail.user_name ? `${showDetail.user_name} (${showDetail.user_email ?? "—"})` : showDetail.user_email ?? showDetail.user_id ?? "—"} dark={dark} />
            </div>
            <div className={cn("border-t px-5 py-3", dark ? "border-gray-700" : "border-gray-200")}>
              <button
                onClick={() => setShowDetail(null)}
                className={cn("rounded-md border px-4 py-2 text-sm font-medium", dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, dark, mono }: { label: string; value: string; dark: boolean; mono?: boolean }) {
  return (
    <div>
      <span className={cn("text-xs font-medium", dark ? "text-gray-400" : "text-gray-500")}>{label}</span>
      <p className={cn("mt-0.5 text-sm break-all", mono && "font-mono text-xs", dark ? "text-gray-200" : "text-gray-900")}>{value}</p>
    </div>
  );
}
