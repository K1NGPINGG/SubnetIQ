import { useAuthStore } from "@/shared/lib/auth-store";

const READ_ONLY_ROLES = new Set(["viewer", "read_only", "read-only"]);

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "").toLowerCase();
  const isReadOnly = READ_ONLY_ROLES.has(role);
  return {
    isReadOnly,
    canWrite: !isReadOnly,
    isAdmin: role === "admin",
  };
}
