import { cn } from "@/shared/lib/utils";

/**
 * SubnetIQ brand logo (geometric cyan/sapphire "iq" monogram) paired with the
 * "SubnetIQ" wordmark in Inter. The monogram image ships in `public/logo.png`.
 */
export function Logo({
  size = 40,
  showText = true,
  textClassName,
  className,
}: {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt="SubnetIQ"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span
          className={cn(
            "font-sans tracking-tight",
            textClassName ?? "text-slate-900 dark:text-white"
          )}
        >
          SubnetIQ
        </span>
      )}
    </div>
  );
}
