import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  Globe,
  Radar,
  Building2,
  Radio,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Moon,
  Sun,
  Shield,
  Users,
  Server,
  Monitor,
  Settings,
  HelpCircle,
  Info,
  ScrollText,
  Box,
  Layers,
  Landmark,
  Boxes,
  Hash,
  Tag,
  ListChecks,
  Gavel,
  ListTree,
  Webhook,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "@/components/ui/GlobalSearch";

const mainNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sites", label: "Sites", icon: Building2 },
  { to: "/vlans", label: "VLANs", icon: Radio },
  { to: "/subnets", label: "Subnets", icon: Network },
  { to: "/ips", label: "IP Addresses", icon: Globe },
  { to: "/ipam-records", label: "IPAM Records", icon: ListTree },
  { to: "/vips", label: "Virtual IPs", icon: Layers },
  { to: "/assets", label: "Assets", icon: Box },
  { to: "/discovery", label: "Discovery", icon: Radar },
  { to: "/approvals", label: "Approvals", icon: Gavel },
  { to: "/audit", label: "Audit", icon: History },
];

const hierarchyNavItems = [
  { to: "/vrfs", label: "VRFs", icon: Layers },
  { to: "/rirs", label: "RIRs", icon: Landmark },
  { to: "/aggregates", label: "Aggregates", icon: Boxes },
  { to: "/ip-ranges", label: "IP Ranges", icon: ListChecks },
  { to: "/asns", label: "ASNs", icon: Hash },
];

const adminSubItems = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/snmp", label: "SNMP Profiles", icon: Server },
  { to: "/admin/winrm", label: "WinRM Profiles", icon: Monitor },
  { to: "/admin/tags", label: "Tags", icon: Tag },
  { to: "/admin/custom-fields", label: "Custom Fields", icon: BookOpen },
  { to: "/admin/validation-rules", label: "Validation Rules", icon: Shield },
  { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/admin/integrations", label: "Integrations", icon: Settings },
  { to: "/admin/update", label: "Updates", icon: RefreshCw },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

const bottomNavItems = [
  { to: "/help", label: "Help", icon: HelpCircle },
  { to: "/about", label: "About", icon: Info },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/sites": "Sites",
  "/vlans": "VLANs",
  "/subnets": "Subnets",
  "/ips": "IP Addresses",
  "/ipam-records": "IPAM Records",
  "/vips": "Virtual IPs",
  "/assets": "Assets",
  "/discovery": "Discovery",
  "/approvals": "Approvals",
  "/audit": "Audit",
  "/vrfs": "VRFs",
  "/rirs": "RIRs",
  "/aggregates": "Aggregates",
  "/ip-ranges": "IP Ranges",
  "/asns": "ASNs",
  "/admin/users": "Users",
  "/admin/snmp": "SNMP Profiles",
  "/admin/winrm": "WinRM Profiles",
  "/admin/tags": "Tags",
  "/admin/custom-fields": "Custom Fields",
  "/admin/validation-rules": "Validation Rules",
  "/admin/webhooks": "Webhooks",
  "/admin/integrations": "Integrations",
  "/admin/update": "Updates",
  "/admin/audit": "Audit Log",
  "/about": "About SubnetIQ",
  "/help": "Help & Documentation",
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();

  const pageTitle =
    pageTitles[location.pathname] ||
    mainNavItems.find((i) => location.pathname.startsWith(i.to) && i.to !== "/")
      ?.label ||
    hierarchyNavItems.find((i) => location.pathname.startsWith(i.to))
      ?.label ||
    "Dashboard";

  const isAdmin = user?.role === "admin";
  const isAdminActive = location.pathname.startsWith("/admin");
  const isHierarchyActive = hierarchyNavItems.some((i) =>
    location.pathname.startsWith(i.to)
  );

  return (
    <div className={cn("flex h-screen overflow-hidden", dark ? "bg-gray-950" : "bg-gray-100")}>
      <aside
        className={cn(
          "flex flex-col transition-all duration-300",
          dark ? "bg-gray-900 text-white" : "bg-gray-900 text-white",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
          {!collapsed && (
            <img src="/logo.png" alt="SubnetIQ" className="h-10 w-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {mainNavItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 px-2 py-2">
          <button
            onClick={() => {
              if (collapsed) return;
              setHierarchyOpen(!hierarchyOpen);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isHierarchyActive
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            title={collapsed ? "Address Hierarchy" : undefined}
          >
            <Boxes className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Hierarchy</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    hierarchyOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>
          {!collapsed && hierarchyOpen && (
            <div className="mt-1 space-y-0.5 pl-3">
              {hierarchyNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 px-2 py-2">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  if (collapsed) return;
                  setAdminOpen(!adminOpen);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isAdminActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
                title={collapsed ? "Admin" : undefined}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Admin</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        adminOpen && "rotate-180"
                      )}
                    />
                  </>
                )}
              </button>
              {!collapsed && adminOpen && (
                <div className="mt-1 space-y-0.5 pl-3">
                  {adminSubItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "flex h-14 items-center justify-between border-b px-6",
            dark
              ? "border-gray-700 bg-gray-900"
              : "border-gray-200 bg-white"
          )}
        >
          <h1 className={cn("text-lg font-semibold", dark ? "text-white" : "text-gray-900")}>
            {pageTitle}
          </h1>
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <button
              onClick={toggle}
              className={cn(
                "rounded-md p-2 transition-colors",
                dark
                  ? "text-gray-400 hover:bg-gray-800 hover:text-yellow-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              )}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                  dark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline">
                  {user?.display_name ?? user?.email ?? "User"}
                </span>
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute right-0 z-50 mt-1 w-56 rounded-md border py-1 shadow-lg",
                      dark
                        ? "border-gray-700 bg-gray-800"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "border-b px-4 py-2",
                        dark ? "border-gray-700" : "border-gray-100"
                      )}
                    >
                      <p className={cn("text-sm font-medium", dark ? "text-white" : "text-gray-900")}>
                        {user?.display_name}
                      </p>
                      <p className={cn("text-xs", dark ? "text-gray-400" : "text-gray-500")}>
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/profile");
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        dark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        window.location.href = "/login";
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto p-6", dark ? "text-gray-100" : "text-gray-900")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
