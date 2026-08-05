import {
  LayoutDashboard,
  Globe,
  ListTree,
  Layers,
  Network,
  ListChecks,
  Boxes,
  Building2,
  Radio,
  Route,
  Box,
  Hash,
  Landmark,
  Radar,
  Gavel,
  Server,
  Monitor,
  Users,
  Tag,
  BookOpen,
  ShieldCheck,
  Webhook,
  Settings,
  ScrollText,
  RefreshCw,
  Database,
  HelpCircle,
  Info,
  History,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from the sidebar for read-only users when false. */
  readOnlyVisible?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Standalone item pinned above all sections. */
export const dashboardNav: NavItem = {
  to: "/",
  label: "Dashboard",
  icon: LayoutDashboard,
};

/** Categorized navigation sections (shown as non-collapsible headers). */
export const navSections: NavSection[] = [
  {
    title: "IPAM Core",
    items: [
      { to: "/ips", label: "IP Addresses", icon: Globe },
      { to: "/ipam-records", label: "IPAM Records", icon: ListTree },
      { to: "/vips", label: "Virtual IPs", icon: Layers },
      { to: "/subnets", label: "Subnets", icon: Network },
      { to: "/ip-ranges", label: "IP Ranges", icon: ListChecks },
      { to: "/aggregates", label: "Aggregates", icon: Boxes },
    ],
  },
  {
    title: "Infrastructure & Sites",
    items: [
      { to: "/sites", label: "Sites", icon: Building2 },
      { to: "/vlans", label: "VLANs", icon: Radio },
      { to: "/vrfs", label: "VRFs", icon: Route },
      { to: "/assets", label: "Network Assets", icon: Box },
      { to: "/asns", label: "ASNs", icon: Hash },
      { to: "/rirs", label: "RIRs", icon: Landmark },
    ],
  },
  {
    title: "Discovery & Operations",
    items: [
      { to: "/discovery", label: "Discovery Jobs", icon: Radar },
      { to: "/approvals", label: "Approvals", icon: Gavel, readOnlyVisible: false },
      { to: "/audit", label: "Audit Trail", icon: History },
      { to: "/admin/snmp", label: "SNMP Profiles", icon: Server, readOnlyVisible: false },
      { to: "/admin/winrm", label: "WinRM Profiles", icon: Monitor, readOnlyVisible: false },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, readOnlyVisible: false },
      { to: "/admin/tags", label: "Tags", icon: Tag },
      { to: "/admin/custom-fields", label: "Custom Fields", icon: BookOpen },
      { to: "/admin/validation-rules", label: "Validation Rules", icon: ShieldCheck, readOnlyVisible: false },
      { to: "/admin/webhooks", label: "Webhooks", icon: Webhook, readOnlyVisible: false },
      { to: "/admin/integrations", label: "Integrations", icon: Settings, readOnlyVisible: false },
      { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
      { to: "/admin/backups", label: "Backups", icon: Database, readOnlyVisible: false },
      { to: "/admin/update", label: "Updates", icon: RefreshCw, readOnlyVisible: false },
      { to: "/help", label: "Help", icon: HelpCircle },
      { to: "/about", label: "About", icon: Info },
    ],
  },
];
