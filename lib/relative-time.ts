/**
 * Compact "14h ago" style stamps.
 *
 * Formatted on the server and passed to the client as strings rather than
 * recomputed after hydration — a value derived from `Date.now()` on both sides
 * can straddle a minute boundary and produce a hydration mismatch.
 */
export function formatRelative(
  iso: string | null | undefined,
  now = new Date()
): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

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
