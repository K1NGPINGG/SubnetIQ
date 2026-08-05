import { Trash2 } from "lucide-react";
import { useThemeStore } from "@/shared/lib/theme-store";
import { cn } from "@/shared/lib/utils";

export function DeleteButton({
  onClick,
  title = "Delete",
  disabled,
}: {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  const dark = useThemeStore((s) => s.dark);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        dark
          ? "border-gray-600 text-gray-300 hover:bg-red-900/30 hover:text-red-400"
          : "border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600"
      )}
    >
      <Trash2 className="h-3 w-3" />
      Delete
    </button>
  );
}
