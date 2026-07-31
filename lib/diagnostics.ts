import "server-only";

import { getSupabase } from "@/lib/supabase/server";

/**
 * Explains an empty Analytics window.
 *
 * A zero total has three very different causes that all look identical on the
 * page: the window genuinely has no runs, the table is empty, or Row Level
 * Security is hiding every row from the anon key. PostgREST answers the last
 * two with HTTP 200 and `[]` — no error — so the app has to go looking.
 *
 * Only runs when the selected window came back empty, so the normal path costs
 * nothing.
 */
export type EmptyDiagnosis =
  /** Rows exist, just not in the selected window. */
  | { kind: "outside-window"; totalRuns: number; earliest: string; latest: string }
  /** No runs are visible at all — empty table or RLS. */
  | { kind: "no-rows-visible" }
  /** The probe itself failed. */
  | { kind: "error"; message: string }
  /** Nothing useful to say (Supabase not configured). */
  | { kind: "unknown" };

export async function diagnoseEmptyWindow(): Promise<EmptyDiagnosis> {
  const supabase = getSupabase();
  if (!supabase) return { kind: "unknown" };

  const { count, error } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true });

  if (error) return { kind: "error", message: error.message };
  if (!count) return { kind: "no-rows-visible" };

  const [oldest, newest] = await Promise.all([
    supabase
      .from("runs")
      .select("run_date")
      .order("run_date", { ascending: true })
      .limit(1),
    supabase
      .from("runs")
      .select("run_date")
      .order("run_date", { ascending: false })
      .limit(1),
  ]);

  const earliest = (oldest.data?.[0] as { run_date: string } | undefined)
    ?.run_date;
  const latest = (newest.data?.[0] as { run_date: string } | undefined)
    ?.run_date;

  if (!earliest || !latest) return { kind: "no-rows-visible" };

  return { kind: "outside-window", totalRuns: count, earliest, latest };
}
