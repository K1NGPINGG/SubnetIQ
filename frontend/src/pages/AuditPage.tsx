import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useIpHistory } from "@/hooks/api";
import { Badge } from "@/components/ui/Badge";
import { useThemeStore } from "@/shared/lib/theme-store";

const actionVariant: Record<string, "success" | "warning" | "info" | "danger"> = {
  allocated: "success",
  released: "danger",
  updated: "info",
  reserved: "warning",
};

export default function AuditPage() {
  const dark = useThemeStore((s) => s.dark);
  const [address, setAddress] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const { data, isLoading } = useIpHistory(searchValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchValue(address.trim());
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <div className="flex-1 max-w-md">
          <label className={`mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
            IP Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="192.168.1.10"
            className={`w-full rounded-md border px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      {searchValue && isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {searchValue && !isLoading && !data && (
        <div className={`rounded-lg border p-8 text-center ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
          <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            No history found for address <strong className="font-mono">{searchValue}</strong>
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className={`rounded-lg border p-6 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
            <h3 className={`mb-4 text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              Current Status — <span className="font-mono">{data.address}</span>
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Status</p>
                <Badge variant={actionVariant[data.current_status.status] ?? "default"}>
                  {data.current_status.status}
                </Badge>
              </div>
              <div>
                <p className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Hostname</p>
                <p className={`text-sm ${dark ? "text-white" : "text-gray-900"}`}>
                  {data.current_status.hostname ?? "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Device Type</p>
                <p className={`text-sm ${dark ? "text-white" : "text-gray-900"}`}>
                  {data.current_status.device_type ?? "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Assigned To</p>
                <p className={`text-sm ${dark ? "text-white" : "text-gray-900"}`}>
                  {data.current_status.assigned_to ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-6 shadow-sm ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
            <h3 className={`mb-4 text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              History
            </h3>
            {data.history.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No history entries found
              </p>
            ) : (
              <div className={`relative ml-4 space-y-4 border-l-2 pl-6 ${dark ? "border-gray-600" : "border-gray-200"}`}>
                {data.history.map((entry, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-gray-800" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionVariant[entry.action] ?? "default"}>
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {(entry.old_value || entry.new_value) && (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        {entry.old_value && (
                          <span className={`font-mono ${dark ? "text-gray-400" : "text-gray-500"}`}>
                            {entry.old_value}
                          </span>
                        )}
                        {entry.old_value && entry.new_value && (
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                        )}
                        {entry.new_value && (
                          <span className={`font-mono ${dark ? "text-white" : "text-gray-900"}`}>
                            {entry.new_value}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
