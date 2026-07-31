import { getSupabase } from "@/lib/supabase/server";

/**
 * Conversion pulse for the notification poller.
 *
 * Returns the running total of network_clicks across every run, plus enough
 * detail about the newest run to caption a toast. The client compares the total
 * against the one it last saw; an increase means clicks landed since then.
 *
 * Deliberately additive: this reads the runs table directly and does not touch
 * lib/queries.ts, whose window-scoped aggregation answers a different question.
 *
 * Scaling note: PostgREST cannot SUM without an RPC, so the total is computed by
 * pulling one narrow column. That is cheap for a media buyer's run history but
 * grows linearly — if this table ever reaches six figures, move the sum into a
 * Postgres function and call it with .rpc() instead.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

/**
 * Hard ceiling on paging. A backend that ignores the Range header returns the
 * same full page forever, and `rows.length < PAGE_SIZE` would never be true —
 * an infinite loop inside a request handler. 500 pages is half a million runs,
 * far past where the sum should have moved into an RPC anyway.
 */
const MAX_PAGES = 500;

export type ConversionPulse = {
  configured: boolean;
  total: number;
  latest: {
    campaign: string;
    offer: string | null;
    revenue: number;
  } | null;
  error?: string;
};

export async function GET() {
  const supabase = getSupabase();

  if (!supabase) {
    return Response.json({
      configured: false,
      total: 0,
      latest: null,
    } satisfies ConversionPulse);
  }

  // One narrow column, paged the same way the main run fetch is — a truncated
  // page here would look exactly like clicks going backwards.
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("runs")
      .select("network_clicks")
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      return Response.json({
        configured: true,
        total: 0,
        latest: null,
        error: error.message,
      } satisfies ConversionPulse);
    }

    const rows = (data ?? []) as { network_clicks: number | string | null }[];
    for (const row of rows) {
      const n = Number(row.network_clicks);
      if (Number.isFinite(n)) total += n;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  const { data: latestRows } = await supabase
    .from("runs")
    .select(
      `revenue, created_at,
       creative:creatives ( name, offer:offers ( name ) )`
    )
    .order("created_at", { ascending: false })
    .limit(1);

  // PostgREST types embedded relations as arrays; at runtime a to-one join is
  // the object. queries.ts casts the same way for the same reason.
  const latestRow = (latestRows ?? [])[0] as unknown as
    | {
        revenue: number | string | null;
        creative: { name: string; offer: { name: string } | null } | null;
      }
    | undefined;

  return Response.json({
    configured: true,
    total,
    latest: latestRow
      ? {
          campaign: latestRow.creative?.name ?? "Unknown campaign",
          offer: latestRow.creative?.offer?.name ?? null,
          revenue: Number(latestRow.revenue) || 0,
        }
      : null,
  } satisfies ConversionPulse);
}
