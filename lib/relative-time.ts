/**
 * Compact time stamps, formatted on the server and passed to the client as
 * strings. A value derived from `Date.now()` on both sides can straddle a
 * boundary and produce a hydration mismatch.
 */

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14h ago" — how long since something last happened. */
export function formatRelative(
  iso: string | null | undefined,
  now = new Date()
): string | null {
  const then = parse(iso);
  if (!then) return null;

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

/** "6d" — elapsed span, no "ago" suffix. Used for running duration. */
export function formatDuration(
  iso: string | null | undefined,
  now = new Date()
): string | null {
  const then = parse(iso);
  if (!then) return null;

  const minutes = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d`;

  return `${Math.floor(days / 365)}y`;
}
