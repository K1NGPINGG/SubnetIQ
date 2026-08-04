import { cn } from "@/shared/lib/utils";

const CYAN = "#22d3ee";
const CYAN_LIGHT = "#67e8f9";
const SAPPHIRE = "#3b82f6";
const SAPPHIRE_DARK = "#2563eb";

/**
 * Geometric SubnetIQ monogram: interconnecting cyan and sapphire layers that
 * form the letters "iq", paired with the wordmark in Inter.
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
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="sniq-sapphire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SAPPHIRE} />
            <stop offset="100%" stopColor={SAPPHIRE_DARK} />
          </linearGradient>
          <linearGradient id="sniq-cyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CYAN_LIGHT} />
            <stop offset="100%" stopColor={CYAN} />
          </linearGradient>
        </defs>

        {/* "q" ring + tail (sapphire, back layer) */}
        <circle cx="41" cy="31" r="12" stroke="url(#sniq-sapphire)" strokeWidth="11" />
        <path
          d="M39 42 C 35 54, 52 61, 56 48"
          stroke="url(#sniq-sapphire)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* "i" stem + dot (cyan, front layer) - overlaps the ring to interconnect */}
        <rect x="14" y="26" width="12" height="32" rx="6" fill="url(#sniq-cyan)" />
        <circle cx="20" cy="15" r="5.5" fill="url(#sniq-cyan)" />
      </svg>
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
