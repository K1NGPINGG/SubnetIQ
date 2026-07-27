import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/lib/theme-store";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        className={cn(
          "relative w-full mx-4 rounded-xl shadow-2xl",
          dark ? "bg-gray-800" : "bg-white",
          maxWidth
        )}
      >
        {title && (
          <div className={cn("flex items-center justify-between px-6 py-4 border-b", dark ? "border-gray-700" : "border-gray-200")}>
            <h2 className={cn("text-lg font-semibold", dark ? "text-white" : "text-gray-900")}>{title}</h2>
            <button
              onClick={onClose}
              className={cn("p-1 rounded-md transition-colors", dark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className={cn("px-6 py-4 border-t flex justify-end gap-3", dark ? "border-gray-700" : "border-gray-200")}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
