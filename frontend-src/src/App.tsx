import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/lib/auth-store";
import Layout from "@/components/layout/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SubnetsPage from "@/pages/SubnetsPage";
import IpsPage from "@/pages/IpsPage";
import AssetsPage from "@/pages/AssetsPage";
import DiscoveryPage from "@/pages/DiscoveryPage";
import SitesPage from "@/pages/SitesPage";
import VlansPage from "@/pages/VlansPage";
import AuditPage from "@/pages/AuditPage";
import AdminPage from "@/pages/AdminPage";
import ProfilePage from "@/pages/ProfilePage";
import AboutPage from "@/pages/AboutPage";
import HelpPage from "@/pages/HelpPage";
import AuditLogPage from "@/pages/AuditLogPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="subnets" element={<SubnetsPage />} />
        <Route path="ips" element={<IpsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="vlans" element={<VlansPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/users" element={<AdminPage />} />
        <Route path="admin/snmp" element={<AdminPage />} />
        <Route path="admin/winrm" element={<AdminPage />} />
        <Route path="admin/integrations" element={<AdminPage />} />
        <Route path="admin/audit" element={<AuditLogPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
