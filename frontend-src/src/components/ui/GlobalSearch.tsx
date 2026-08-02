import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Network, Globe, Building2, Radio, Layers } from "lucide-react";
import { useSearch } from "@/hooks/api";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";

const kindMeta: Record<string, { label: string; icon: any; to: (id: string) => string }> = {
  subnet: { label: "Subnet", icon: Network, to: () => "/subnets" },
  ip_address: { label: "IP Address", icon: Globe, to: () => "/ips" },
  site: { label: "Site", icon: Building2, to: () => "/sites" },
  vlan: { label: "VLAN", icon: Radio, to: () => "/vlans" },
  vrf: { label: "VRF", icon: Layers, to: () => "/vrfs" },
};

export default function GlobalSearch() {
  const dark = useThemeStore((s) => s.dark);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isLoading } = useSearch(debounced);
  const results = open ? (data?.results ?? []) : [];

  const go = (r: { kind: string; to: string }) => {
    setOpen(false);
    setQuery("");
    navigate(r.to);
  };

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search subnets, IPs, sites..."
          className={cn(
            "w-72 rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            dark
              ? "border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500"
              : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500"
          )}
        />
      </div>

      {open && (debounced.trim().length >= 2 || query.length > 0) && (
        <div
          className={cn(
            "absolute left-0 z-50 mt-1 w-80 rounded-md border shadow-lg",
            dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
          )}
        >
          {isLoading ? (
            <div className={cn("px-4 py-6 text-center text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className={cn("px-4 py-6 text-center text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              No results found
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((r, idx) => {
                const meta = kindMeta[r.kind];
                const Icon = meta?.icon ?? Search;
                return (
                  <li key={`${r.kind}-${r.id}-${idx}`}>
                    <button
                      onClick={() => go({ kind: r.kind, to: meta ? meta.to(r.id) : "/" })}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", dark ? "text-white" : "text-gray-900")}>
                          {r.label}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {meta?.label} {r.secondary ? `· ${r.secondary}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}