import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Moon,
  Sun,
} from "lucide-react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "@/components/ui/GlobalSearch";
import { Logo } from "@/components/ui/Logo";
import { dashboardNav, navSections, type NavItem } from "@/components/layout/navConfig";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/sites": "Sites",
  "/vlans": "VLANs",
  "/subnets": "Subnets",
  "/ips": "IP Addresses",
  "/ipam-records": "IPAM Records",
  "/vips": "Virtual IPs",
  "/assets": "Network Assets",
  "/discovery": "Discovery",
  "/approvals": "Approvals",
  "/audit": "Audit Trail",
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
  "/admin/backups": "Backups",
  "/admin/audit": "Audit Logs",
  "/profile": "Profile",
  "/about": "About SubnetIQ",
  "/help": "Help & Documentation",
};

function SidebarLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <NavLink
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
        active
          ? "border-r-2 border-blue-600 bg-blue-500/10 font-medium text-blue-600 dark:border-blue-400 dark:text-blue-400"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();

  const isActive = (to: string) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(to + "/");

  const pageTitle =
    pageTitles[location.pathname] ??
    navSections
      .flatMap((s) => s.items)
      .find((i) => i.to !== "/" && location.pathname.startsWith(i.to))?.label ??
    "Dashboard";

  return (
    <div className={cn("flex h-screen overflow-hidden", dark ? "bg-gray-950" : "bg-gray-100")}>
      <aside
        className={cn(
          "flex flex-col border-r transition-all duration-300",
          dark
            ? "border-gray-800 bg-gray-900 text-white"
            : "border-slate-200 bg-white text-slate-900",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center justify-between border-b px-4",
            dark ? "border-gray-800" : "border-slate-200"
          )}
        >
          {!collapsed && <Logo size={36} textClassName="text-lg font-semibold text-slate-900 dark:text-white" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "rounded p-1 transition-colors",
              dark
                ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
          <SidebarLink item={dashboardNav} collapsed={collapsed} active={isActive(dashboardNav.to)} />

          {navSections.map((section) => (
            <div key={section.title}>
              <div
                className={cn(
                  "mb-2 mt-6 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider",
                  dark ? "text-slate-500" : "text-slate-400"
                )}
              >
                {!collapsed ? (
                  section.title
                ) : (
                  <div className={cn("h-px w-full", dark ? "bg-slate-700" : "bg-slate-200")} />
                )}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
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
