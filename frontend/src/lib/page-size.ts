const KEY = "subnetiq:page-size";

/** Read the last page size the user selected (per app), with a fallback. */
export function getPersistedPageSize(fallback = 10): number {
  if (typeof window === "undefined") return fallback;
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Remember the page size selection across pages and reloads. */
export function persistPageSize(size: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(size));
  } catch {
    /* storage unavailable */
  }
}
