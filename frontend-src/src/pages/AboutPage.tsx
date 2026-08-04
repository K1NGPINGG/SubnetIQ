import { useThemeStore } from "@/shared/lib/theme-store";
import { Network, Shield, Globe, Radar, Box, Monitor, Table, Layers } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Subnet Management",
    description: "Create, organize, and track IP subnets with hierarchical parent-child relationships. Visualize utilization in real-time.",
  },
  {
    icon: Globe,
    title: "IP Address Tracking",
    description: "Track every IP address across your infrastructure. Automatic status updates, hostname resolution, and MAC address capture.",
  },
  {
    icon: Radar,
    title: "Network Discovery",
    description: "Automated ICMP, ARP, SNMP, and DNS scanning. Schedule recurring scans and get real-time results with device identification.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    description: "Role-based access control with Admin and Read Only roles. Microsoft AD integration, TOTP MFA, and LDAP support.",
  },
  {
    icon: Box,
    title: "Asset Discovery",
    description: "Hardware-level device inventory via SNMP and WinRM. Auto-discovers manufacturer, model, serial number, OS, CPU, RAM, and network interfaces.",
  },
  {
    icon: Monitor,
    title: "WinRM Remote Management",
    description: "Windows host management via PowerShell Remoting. Collects detailed hardware and OS information from Windows servers and workstations.",
  },
  {
    icon: Table,
    title: "IPAM Records",
    description: "A unified view of every IP across all subnets. Search, filter, edit single records, bulk-edit many at once, and export the results to CSV or PDF.",
  },
  {
    icon: Layers,
    title: "Virtual IP Inventory",
    description: "Track Virtual IPs (Keepalived, CARP/VRRP, load balancers, Kubernetes, floating cloud IPs) and link them to their backing node IPs with role bindings.",
  },
];

const techStack = [
  { category: "Backend", items: ["Python 3.12", "FastAPI", "SQLAlchemy 2.0", "Alembic", "Pydantic v2", "PostgreSQL 16", "Redis 7", "Celery", "httpx", "uvicorn"] },
  { category: "Frontend", items: ["React 19", "TypeScript", "Vite 6", "Tailwind CSS v4", "TanStack Query", "TanStack Table", "Zustand", "React Hook Form", "Zod", "Recharts", "Leaflet / react-leaflet", "jsPDF + jspdf-autotable", "axios", "lucide-react"] },
  { category: "Discovery", items: ["pysnmp-lextudio (SNMP v1/v2c/v3)", "pypsrp (WinRM)", "ICMP/ARP scanning"] },
  { category: "Security", items: ["PyJWT", "bcrypt", "passlib", "TOTP MFA", "Fernet encryption", "slowapi rate limiting"] },
  { category: "Infrastructure", items: ["Docker Compose", "Nginx", "Certbot (Let's Encrypt)", "GitHub Actions CI"] },
];

export default function AboutPage() {
  const dark = useThemeStore((s) => s.dark);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <img src="/logo.png" alt="SubnetIQ" className="h-12 w-auto" />
        </div>
        <p className={`text-sm leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>
          SubnetIQ is an enterprise-grade IP Address Management (IPAM) platform designed for
          modern IT infrastructure teams. It provides real-time visibility into your IP space,
          automated network discovery, and intuitive subnet management.
        </p>
      </div>

      <div>
        <h2 className={`text-lg font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
          Key Features
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className={`rounded-lg border p-4 ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${dark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{f.title}</h3>
              </div>
              <p className={`text-xs leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className={`text-lg font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
          Technology Stack
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {techStack.map((t) => (
            <div
              key={t.category}
              className={`rounded-lg border p-4 ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
            >
              <h3 className={`text-sm font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>{t.category}</h3>
              <div className="flex flex-wrap gap-1.5">
                {t.items.map((item) => (
                  <span
                    key={item}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
        <h2 className={`text-lg font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Version</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          SubnetIQ v1.2.5 &mdash; Built with modern open-source technologies.
        </p>
      </div>
    </div>
  );
}
