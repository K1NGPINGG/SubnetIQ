import { cn } from "@/shared/lib/utils";

const CYAN_LIGHT = "#67e8f9";
const CYAN = "#0891b2";
const SAPPHIRE_LIGHT = "#60a5fa";
const SAPPHIRE = "#1d4ed8";

/**
 * Geometric SubnetIQ monogram: a network-mesh made of interconnecting cyan and
 * sapphire layers that abstractly form the letters "i" and "q", paired with the
 * "SubnetIQ" wordmark in Inter.
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
            <stop offset="0%" stopColor={SAPPHIRE_LIGHT} />
            <stop offset="100%" stopColor={SAPPHIRE} />
          </linearGradient>
          <linearGradient id="sniq-cyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CYAN_LIGHT} />
            <stop offset="100%" stopColor={CYAN} />
          </linearGradient>
        </defs>

        {/* "q" ring + tail (sapphire mesh layer) */}
        <circle cx="44" cy="32" r="11" stroke="url(#sniq-sapphire)" strokeWidth="3" />
        <path
          d="M44 43 L44 52 Q44 56 50 54"
          stroke="url(#sniq-sapphire)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* "i" stem (cyan mesh layer) */}
        <line
          x1="20"
          y1="25"
          x2="20"
          y2="49"
          stroke="url(#sniq-cyan)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* interconnection bridge between the "i" spine and the "q" ring */}
        <line x1="20" y1="37" x2="33" y2="32" stroke="url(#sniq-cyan)" strokeWidth="2" />

        {/* mesh nodes */}
        <circle cx="20" cy="13" r="4.5" fill="url(#sniq-cyan)" />
        <circle cx="20" cy="25" r="2" fill="url(#sniq-cyan)" />
        <circle cx="20" cy="37" r="2" fill="url(#sniq-cyan)" />
        <circle cx="20" cy="49" r="2" fill="url(#sniq-cyan)" />
        <circle cx="33" cy="32" r="2" fill="url(#sniq-sapphire)" />
        <circle cx="44" cy="21" r="2" fill="url(#sniq-sapphire)" />
        <circle cx="55" cy="32" r="2" fill="url(#sniq-sapphire)" />
        <circle cx="44" cy="43" r="2" fill="url(#sniq-sapphire)" />
        <circle cx="50" cy="54" r="2" fill="url(#sniq-sapphire)" />
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
