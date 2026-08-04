/** Format an ISO timestamp using UK standard ordering: HH:MM:SS - DD/MM/YYYY. */
export function formatUkDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  // Use UTC components so timestamps like "2026-08-04T21:06:40Z" render as
  // "21:06:40 - 04/08/2026" regardless of the viewer's timezone.
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} - ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Reformat ISO timestamps found inside a log/plain-text blob to UK format. */
export function formatUkTimestampsInText(text: string): string {
  return text.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/g,
    (m) => formatUkDateTime(m)
  );
}
