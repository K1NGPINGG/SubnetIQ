import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Settings,
  Shield,
  Server,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Globe,
  Wifi,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
} from "@/hooks/api";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validators";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { User, UserCreate, UserUpdate } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";
import { useThemeStore } from "@/shared/lib/theme-store";
import SnmpProfilesPage from "@/pages/SnmpProfilesPage";
import WinrmProfilesPage from "@/pages/WinrmProfilesPage";

const userCol = createColumnHelper<User>();

type Tab = "users" | "integrations" | "snmp" | "winrm";

// ── Integration settings state ───────────────────────────────────────

interface IntegrationSettings {
  azure_ad: {
    enabled: boolean;
    tenant_id: string;
    client_id: string;
    client_secret: string;
  };
  ldap: {
    enabled: boolean;
    server: string;
    port: number;
    base_dn: string;
    bind_dn: string;
    bind_password: string;
    user_filter: string;
    group_filter: string;
    use_ssl: boolean;
  };
  dns: {
    enabled: boolean;
    servers: string[];
    search_domains: string[];
  };
  dhcp: {
    enabled: boolean;
    servers: string[];
  };
}

const defaultSettings: IntegrationSettings = {
  azure_ad: {
    enabled: false,
    tenant_id: "",
    client_id: "",
    client_secret: "",
  },
  ldap: {
    enabled: false,
    server: "",
    port: 389,
    base_dn: "",
    bind_dn: "",
    bind_password: "",
    user_filter: "",
    group_filter: "",
    use_ssl: false,
  },
  dns: {
    enabled: false,
    servers: [],
    search_domains: [],
  },
  dhcp: {
    enabled: false,
    servers: [],
  },
};

// ── Main Admin Page ───────────────────────────────────────────────────

export default function AdminPage() {
  const location = useLocation();
  const path = location.pathname;

  // Determine active tab from URL
  let activeTab: Tab = "users";
  if (path.includes("/admin/snmp")) activeTab = "snmp";
  else if (path.includes("/admin/winrm")) activeTab = "winrm";
  else if (path.includes("/admin/integrations")) activeTab = "integrations";

  return (
    <div className="space-y-4">
      {activeTab === "users" && <UsersTab />}
      {activeTab === "snmp" && <SnmpTab />}
      {activeTab === "winrm" && <WinrmTab />}
      {activeTab === "integrations" && <IntegrationsTab />}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────

function UsersTab() {
  const dark = useThemeStore((s) => s.dark);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);

  const { data = [], isLoading } = useAdminUsers();
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const filtered = search
    ? data.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.display_name.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = filtered.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    userCol.accessor("display_name", {
      header: "Name",
      cell: (info) => (
        <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>
          {info.getValue()}
        </span>
      ),
    }),
    userCol.accessor("email", { header: "Email" }),
    userCol.accessor("role", {
      header: "Role",
      cell: (info) => (
        <Badge variant={info.getValue() === "admin" ? "info" : "default"}>
          {info.getValue()}
        </Badge>
      ),
    }),
    userCol.accessor("is_active", {
      header: "Status",
      cell: (info) => (
        <Badge variant={info.getValue() ? "success" : "danger"}>
          {info.getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    userCol.accessor("mfa_enabled", {
      header: "MFA Status",
      cell: (info) => (
        <Badge variant={info.getValue() ? "success" : "default"}>
          {info.getValue() ? "Enabled" : "Disabled"}
        </Badge>
      ),
    }),
    userCol.accessor("mfa_enforced", {
      header: "MFA Required",
      cell: (info) => (
        <Badge variant={info.getValue() ? "warning" : "default"}>
          {info.getValue() ? "Required" : "Optional"}
        </Badge>
      ),
    }),
    userCol.accessor("created_at", {
      header: "Created",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    userCol.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditItem(info.row.original)}
            className={`rounded p-1.5 ${
              dark
                ? "text-gray-400 hover:bg-gray-700 hover:text-blue-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-blue-600"
            }`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteItem(info.row.original)}
            className={`rounded p-1.5 ${
              dark
                ? "text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                : "text-gray-500 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            placeholder="Search users..."
            className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              dark
                ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400"
                : "border-gray-300"
            }`}
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add User
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
        <UserFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={(d) =>
            createMutation.mutate(d, { onSuccess: () => setCreateOpen(false) })
          }
          loading={createMutation.isPending}
          mode="create"
        />
      )}

      {editItem && (
        <UserFormModal
          open
          onClose={() => setEditItem(null)}
          onSubmit={(d) =>
            updateMutation.mutate(
              { id: editItem.id, data: d },
              { onSuccess: () => setEditItem(null) }
            )
          }
          loading={updateMutation.isPending}
          mode="edit"
          defaultValues={{
            email: editItem.email,
            display_name: editItem.display_name,
            role: editItem.role,
            is_active: editItem.is_active,
            mfa_enforced: editItem.mfa_enforced,
          }}
        />
      )}

      {deleteItem && (
        <Modal
          open
          onClose={() => setDeleteItem(null)}
          title="Delete User"
          footer={
            <>
              <button
                onClick={() => setDeleteItem(null)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  dark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
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
            Are you sure you want to delete user{" "}
            <strong>{deleteItem.display_name}</strong> ({deleteItem.email})?
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── User Form Modal ───────────────────────────────────────────────────

function UserFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  mode,
  defaultValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
  mode: "create" | "edit";
  defaultValues?: any;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [showPassword, setShowPassword] = useState(false);
  const schema = mode === "create" ? adminUserCreateSchema : adminUserUpdateSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;
  const labelClass = `mb-1 block text-sm font-medium ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add User" : "Edit User"}
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              dark
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Display Name</label>
          <input {...register("display_name")} className={inputClass} placeholder="John Doe" />
          {errors.display_name && (
            <p className="mt-1 text-xs text-red-600">
              {(errors.display_name?.message as string) || ""}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            {...register("email")}
            type="email"
            className={inputClass}
            placeholder="user@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">
              {(errors.email?.message as string) || ""}
            </p>
          )}
        </div>
        {mode === "create" && (
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className={inputClass}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {(errors.password?.message as string) || ""}
              </p>
            )}
          </div>
        )}
        <div>
          <label className={labelClass}>Role</label>
          <select {...register("role")} className={inputClass}>
            <option value="viewer">Read Only</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-xs text-red-600">
              {(errors.role?.message as string) || ""}
            </p>
          )}
        </div>
        {mode === "edit" && (
          <>
            <div>
              <label className={labelClass}>Reset Password</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className={inputClass}
                  placeholder="Leave blank to keep current"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {(errors.password?.message as string) || ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_active" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Active
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mfa_enforced"
                {...register("mfa_enforced")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="mfa_enforced" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Enforce MFA — require this user to set up multi-factor authentication
              </label>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

// ── SNMP Profiles Tab ──────────────────────────────────────────────────

function SnmpTab() {
  return <SnmpProfilesPage />;
}

// ── WinRM Profiles Tab ──────────────────────────────────────────────

function WinrmTab() {
  return <WinrmProfilesPage />;
}

// ── Integrations Tab ──────────────────────────────────────────────────

function IntegrationsTab() {
  const dark = useThemeStore((s) => s.dark);
  const [settings, setSettings] = useState<IntegrationSettings>(() => {
    try {
      const saved = localStorage.getItem("subnetiq_integrations");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSection = (section: keyof IntegrationSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  };

  const updateArrayField = (
    section: keyof IntegrationSettings,
    key: string,
    value: string
  ) => {
    const arr = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateSection(section, key, arr);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save (would be API call in production)
    await new Promise((r) => setTimeout(r, 1000));
    localStorage.setItem("subnetiq_integrations", JSON.stringify(settings));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;
  const labelClass = `mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`;

  const sections = [
    {
      key: "azure_ad" as const,
      title: "Azure Active Directory",
      icon: Shield,
      description: "Authenticate users via Microsoft Entra ID (Azure AD)",
    },
    {
      key: "ldap" as const,
      title: "LDAP / Active Directory",
      icon: Server,
      description: "Authenticate users via LDAP or on-premises Active Directory",
    },
    {
      key: "dns" as const,
      title: "DNS Servers",
      icon: Globe,
      description: "DNS servers used for hostname resolution during discovery scans",
    },
    {
      key: "dhcp" as const,
      title: "DHCP Servers",
      icon: RefreshCw,
      description: "DHCP servers for lease tracking and IP assignment",
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div
          key={section.key}
          className={`rounded-lg border p-6 ${
            dark
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                dark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
              }`}
            >
              <section.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                {section.title}
              </h3>
              <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {section.description}
              </p>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() =>
                updateSection(section.key, "enabled", !settings[section.key].enabled)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[section.key].enabled ? "bg-blue-600" : dark ? "bg-gray-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[section.key].enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
              {settings[section.key].enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {settings[section.key].enabled && (
            <div className="space-y-4 pt-2">
              {/* Azure AD fields */}
              {section.key === "azure_ad" && (
                <>
                  <div>
                    <label className={labelClass}>Tenant ID</label>
                    <input
                      value={settings.azure_ad.tenant_id}
                      onChange={(e) => updateSection("azure_ad", "tenant_id", e.target.value)}
                      className={inputClass}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Client ID</label>
                    <input
                      value={settings.azure_ad.client_id}
                      onChange={(e) => updateSection("azure_ad", "client_id", e.target.value)}
                      className={inputClass}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Client Secret</label>
                    <input
                      type="password"
                      value={settings.azure_ad.client_secret}
                      onChange={(e) => updateSection("azure_ad", "client_secret", e.target.value)}
                      className={inputClass}
                      placeholder="Enter client secret"
                    />
                  </div>
                </>
              )}

              {/* LDAP fields */}
              {section.key === "ldap" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Server</label>
                      <input
                        value={settings.ldap.server}
                        onChange={(e) => updateSection("ldap", "server", e.target.value)}
                        className={inputClass}
                        placeholder="ldap://10.10.10.1"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Port</label>
                      <input
                        type="number"
                        value={settings.ldap.port}
                        onChange={(e) => updateSection("ldap", "port", parseInt(e.target.value) || 389)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Base DN</label>
                    <input
                      value={settings.ldap.base_dn}
                      onChange={(e) => updateSection("ldap", "base_dn", e.target.value)}
                      className={inputClass}
                      placeholder="DC=example,DC=com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Bind DN</label>
                      <input
                        value={settings.ldap.bind_dn}
                        onChange={(e) => updateSection("ldap", "bind_dn", e.target.value)}
                        className={inputClass}
                        placeholder="CN=service,DC=example,DC=com"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bind Password</label>
                      <input
                        type="password"
                        value={settings.ldap.bind_password}
                        onChange={(e) => updateSection("ldap", "bind_password", e.target.value)}
                        className={inputClass}
                        placeholder="Enter bind password"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>User Filter</label>
                      <input
                        value={settings.ldap.user_filter}
                        onChange={(e) => updateSection("ldap", "user_filter", e.target.value)}
                        className={inputClass}
                        placeholder="(objectClass=user)"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Group Filter</label>
                      <input
                        value={settings.ldap.group_filter}
                        onChange={(e) => updateSection("ldap", "group_filter", e.target.value)}
                        className={inputClass}
                        placeholder="(objectClass=group)"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ldap_ssl"
                      checked={settings.ldap.use_ssl}
                      onChange={(e) => updateSection("ldap", "use_ssl", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="ldap_ssl" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      Use SSL / LDAPS (port 636)
                    </label>
                  </div>
                </>
              )}

              {/* DNS fields */}
              {section.key === "dns" && (
                <>
                  <div>
                    <label className={labelClass}>DNS Servers (comma separated)</label>
                    <input
                      value={settings.dns.servers.join(", ")}
                      onChange={(e) => updateArrayField("dns", "servers", e.target.value)}
                      className={inputClass}
                      placeholder="8.8.8.8, 8.8.4.4, 1.1.1.1"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Search Domains (comma separated)</label>
                    <input
                      value={settings.dns.search_domains.join(", ")}
                      onChange={(e) => updateArrayField("dns", "search_domains", e.target.value)}
                      className={inputClass}
                      placeholder="example.com, lab.local"
                    />
                  </div>
                </>
              )}

              {/* DHCP fields */}
              {section.key === "dhcp" && (
                <div>
                  <label className={labelClass}>DHCP Servers (comma separated)</label>
                  <input
                    value={settings.dhcp.servers.join(", ")}
                    onChange={(e) => updateArrayField("dhcp", "servers", e.target.value)}
                    className={inputClass}
                    placeholder="10.10.10.1, 10.10.10.2"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Key className="h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>
    </div>
  );
}
