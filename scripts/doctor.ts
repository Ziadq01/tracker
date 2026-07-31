/**
 * ADRIX connection doctor — `npm run doctor`
 *
 * Answers "why is the dashboard showing $0.00 when Supabase has data?".
 *
 * The reason this needs a dedicated tool: when Row Level Security blocks a
 * table, PostgREST does not return an error. It returns HTTP 200 with an empty
 * array, which is indistinguishable from "no rows in range" at the call site.
 * The app renders that as a legitimate zero.
 *
 * Optional: set SUPABASE_SERVICE_ROLE_KEY to get a definitive RLS verdict by
 * comparing what the anon key sees against what the service role sees. Without
 * it the script still reports what the anon key can reach, it just can't tell
 * "empty table" from "blocked table" with certainty.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { APP_TIMEZONE, resolveRange } from "../lib/date-ranges";
import { calculateMetrics, formatCurrency } from "../lib/metrics";

/* -------------------------------------------------------------------------- */
/*  Output helpers                                                            */
/* -------------------------------------------------------------------------- */

// Colour only when attached to a TTY, so piped and CI output stays clean.
const tty = process.stdout.isTTY;
const paint = (code: string, text: string) =>
  tty ? `\u001b[${code}m${text}\u001b[0m` : text;

const PASS = paint("32", "PASS");
const FAIL = paint("31", "FAIL");
const WARN = paint("33", "WARN");
const INFO = paint("36", "INFO");

let failures = 0;
let warnings = 0;

const pass = (msg: string) => console.log(`  [${PASS}] ${msg}`);
const info = (msg: string) => console.log(`  [${INFO}] ${msg}`);
const warn = (msg: string) => {
  warnings += 1;
  console.log(`  [${WARN}] ${msg}`);
};
const fail = (msg: string) => {
  failures += 1;
  console.log(`  [${FAIL}] ${msg}`);
};
const heading = (msg: string) => console.log(`\n${msg}`);

/* -------------------------------------------------------------------------- */
/*  Env                                                                       */
/* -------------------------------------------------------------------------- */

/** Minimal .env parser — the script runs outside Next, which normally does this. */
function loadEnvFile(file: string) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "").trim();
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const TABLES = [
  "offers",
  "bc_accounts",
  "creatives",
  "runs",
  "offer_stats",
] as const;

/** The exact embedded select the Analytics page uses. */
const RUN_SELECT = `
  id, creative_id, run_date, ad_spend, revenue, tiktok_clicks,
  network_clicks, status, created_at,
  creative:creatives (
    id, name, status,
    offer:offers ( id, name, glitchy_offer_id ),
    bc_account:bc_accounts ( id, name, type )
  )
`;

async function main() {
  console.log("\nADRIX connection doctor");
  console.log("=======================");

  /* ---- 1. Environment -------------------------------------------------- */
  heading("1. Environment");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
  } else {
    try {
      const parsed = new URL(url);
      pass(`NEXT_PUBLIC_SUPABASE_URL = ${parsed.origin}`);
      if (url.trim() !== url) {
        warn("The URL has surrounding whitespace — trim it.");
      }
    } catch {
      fail(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}"`);
    }
  }

  if (!anonKey) {
    fail("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  } else {
    pass(`NEXT_PUBLIC_SUPABASE_ANON_KEY is set (${anonKey.length} chars)`);
    // Supabase anon keys are JWTs; a publishable/secret key or a truncated
    // paste is a common cause of a silently empty dashboard.
    if (anonKey.split(".").length !== 3) {
      warn(
        "That key is not a 3-part JWT. Copy the anon/public key from " +
          "Project Settings -> API."
      );
    }
    if (serviceKey && anonKey === serviceKey) {
      warn("The anon key and service role key are identical — check both.");
    }
  }

  if (!url || !anonKey) {
    console.log(
      "\nWithout both variables the app renders its 'not connected' state and " +
        "every metric reads zero.\n\nIf this is a Vercel deploy: NEXT_PUBLIC_* " +
        "values are inlined at BUILD time. Setting them after a deploy has no " +
        "effect until you redeploy."
    );
    process.exit(1);
  }

  info(`Dates resolve in ${APP_TIMEZONE} (NEXT_PUBLIC_APP_TIMEZONE)`);

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  if (!service) {
    info(
      "SUPABASE_SERVICE_ROLE_KEY not set — RLS diagnosis will be indicative, " +
        "not definitive."
    );
  }

  /* ---- 2. Reachability ------------------------------------------------- */
  heading("2. Reachability");

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
    });
    if (response.ok) {
      pass(`PostgREST reachable (HTTP ${response.status})`);
    } else if (response.status === 401 || response.status === 403) {
      fail(
        `HTTP ${response.status} — the anon key is rejected by this project. ` +
          "Key and URL are probably from different projects."
      );
    } else {
      // Any other status still proves the host answered; the per-table checks
      // below are the meaningful test.
      info(`Host answered with HTTP ${response.status} on /rest/v1/`);
    }
  } catch (error) {
    fail(`Could not reach ${url}: ${(error as Error).message}`);
    process.exit(1);
  }

  /* ---- 3. Table visibility (the RLS check) ----------------------------- */
  heading("3. Table visibility with the anon key");

  const counts: Record<string, number | null> = {};
  let rlsSuspected = false;

  for (const table of TABLES) {
    const { count, error } = await anon
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      counts[table] = null;
      if (error.code === "42P01") {
        fail(`${table}: table does not exist — run supabase/schema.sql.`);
      } else {
        fail(`${table}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
      }
      continue;
    }

    counts[table] = count ?? 0;

    if ((count ?? 0) > 0) {
      pass(`${table}: ${count} rows visible`);
      continue;
    }

    // Zero visible rows. Is it empty, or is RLS hiding it?
    if (service) {
      const { count: trueCount } = await service
        .from(table)
        .select("*", { count: "exact", head: true });
      if ((trueCount ?? 0) > 0) {
        rlsSuspected = true;
        fail(
          `${table}: 0 rows visible to anon but ${trueCount} rows actually ` +
            "exist — RLS is blocking reads."
        );
      } else {
        warn(`${table}: genuinely empty (0 rows).`);
      }
    } else {
      warn(
        `${table}: 0 rows visible. Either the table is empty or RLS is ` +
          "blocking the anon key — PostgREST returns 200 with [] in both cases."
      );
    }
  }

  if (rlsSuspected) {
    console.log(
      "\n  -> Fix: run the Row Level Security block at the bottom of " +
        "supabase/schema.sql.\n     It enables RLS and grants the anon key " +
        "read/write, which this app needs\n     because it ships without " +
        "authentication."
    );
  }

  /* ---- 4. The embedded join -------------------------------------------- */
  heading("4. runs -> creatives -> offers/bc_accounts join");

  const { data: joinRows, error: joinError } = await anon
    .from("runs")
    .select(RUN_SELECT)
    .limit(1);

  if (joinError) {
    fail(`Join failed: ${joinError.message}`);
    if (joinError.code === "PGRST200") {
      console.log(
        "  -> PostgREST cannot see a foreign key from runs.creative_id to " +
          "creatives.id.\n     Recreate the tables with supabase/schema.sql so " +
          "the FKs exist."
      );
    }
  } else if (!joinRows?.length) {
    warn("Join query returned no rows — nothing to verify against.");
  } else {
    const row = joinRows[0] as unknown as {
      creative: { name: string; offer: { name: string } | null } | null;
    };
    if (row.creative) {
      pass(
        `Join works (sample creative: "${row.creative.name}"` +
          `${row.creative.offer ? `, offer: "${row.creative.offer.name}"` : ""})`
      );
    } else {
      warn(
        "Join returned null creative — runs.creative_id may not match any " +
          "creatives.id."
      );
    }
  }

  /* ---- 5. Where the data actually sits --------------------------------- */
  heading("5. Date coverage of runs");

  const { data: oldest } = await anon
    .from("runs")
    .select("run_date")
    .order("run_date", { ascending: true })
    .limit(1);
  const { data: newest } = await anon
    .from("runs")
    .select("run_date")
    .order("run_date", { ascending: false })
    .limit(1);

  const first = (oldest?.[0] as { run_date: string } | undefined)?.run_date;
  const last = (newest?.[0] as { run_date: string } | undefined)?.run_date;

  if (!first || !last) {
    warn("No runs visible, so there is no date range to report.");
  } else {
    info(`runs.run_date spans ${first} .. ${last}`);
  }

  /* ---- 6. Replay the page's own query ---------------------------------- */
  heading("6. Replaying the Analytics query per range");

  for (const key of ["today", "yesterday", "7d", "30d"]) {
    const range = resolveRange({ range: key });
    const { data, error } = await anon
      .from("runs")
      .select("ad_spend, revenue, tiktok_clicks, network_clicks")
      .gte("run_date", range.current.startDate)
      .lte("run_date", range.current.endDate);

    if (error) {
      fail(`${range.label}: ${error.message}`);
      continue;
    }

    const rows = data ?? [];
    const metrics = calculateMetrics(rows as never);
    const label = `${range.label} (${range.current.startDate}..${range.current.endDate})`;

    if (rows.length === 0) {
      warn(`${label}: 0 runs`);
    } else {
      pass(
        `${label}: ${rows.length} runs, revenue ${formatCurrency(metrics.revenue)}, ` +
          `spend ${formatCurrency(metrics.adSpend)}, profit ${formatCurrency(metrics.profit)}`
      );
    }
  }

  if (last) {
    const today = resolveRange({ range: "today" });
    if (last < today.current.startDate) {
      console.log(
        `\n  -> The newest run is ${last}, but the page defaults to Today ` +
          `(${today.current.startDate}).\n     A $0.00 total is correct for that ` +
          "window. Pick 7D/30D, or check whether your\n     ingest has stopped."
      );
    }
  }

  /* ---- Verdict --------------------------------------------------------- */
  heading("Verdict");

  const visible = TABLES.map((t) => counts[t]).filter(
    (c): c is number => c !== null
  );
  const allZero = visible.length > 0 && visible.every((c) => c === 0);

  if (rlsSuspected) {
    fail(
      "Row Level Security is hiding your data from the anon key. That is why " +
        "the dashboard reads $0.00."
    );
  } else if (allZero) {
    fail(
      "Every table returned 0 rows with no error. That is the signature of " +
        "either RLS blocking the anon key or a genuinely empty database — and " +
        "PostgREST cannot tell you which, because it answers 200 with [] in " +
        "both cases."
    );
    console.log(
      "  -> If the Supabase table editor shows rows, it is RLS. Run the policy\n" +
        "     block at the bottom of supabase/schema.sql, or re-run this with\n" +
        "     SUPABASE_SERVICE_ROLE_KEY=... for a definitive answer."
    );
  } else if (counts.runs === 0) {
    fail("The runs table is empty or unreadable, so every metric is zero.");
  } else if (failures === 0 && warnings === 0) {
    pass("Everything checks out — the app should be showing this data.");
  } else {
    info(
      "No connection failure found. If the page still reads $0.00, compare " +
        "the range totals in step 6 against what the page shows for the same " +
        "range."
    );
  }

  console.log(
    `\n${failures === 0 ? "No failures" : `${failures} failure(s)`}` +
      `, ${warnings} warning(s).\n`
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\nDoctor crashed:", error);
  process.exit(1);
});
