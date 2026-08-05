import { Pencil } from "lucide-react";
import { useThemeStore } from "@/shared/lib/theme-store";
import { usePermission } from "@/shared/lib/use-permission";
import { cn } from "@/shared/lib/utils";

export function EditButton({ onClick, title = "Edit" }: { onClick: () => void; title?: string }) {
  const dark = useThemeStore((s) => s.dark);
  const { canWrite } = usePermission();
  if (!canWrite) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        dark
          ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-blue-400"
          : "border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
      )}
    >
      <Pencil className="h-3 w-3" />
      Edit
    </button>
  );
}
