# ADRIX

Performance tracking for affiliate media buyers. Dense and monochrome — think
Bloomberg terminal meets Shopify admin. Light and dark, toggled from the sidebar.

Next.js 14 (App Router) · Supabase · shadcn/ui · Recharts · Tailwind · Inter.
No authentication.

Pages: **Analytics** (`/`, which redirects to `/analytics`), Creatives, Offers,
and BC Accounts. The sidebar collapses to give the tables full width; the state
persists alongside the theme.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Then create the schema in your Supabase project — paste `supabase/schema.sql`
into the SQL editor and run it. `supabase/seed.sql` is optional and fills the
dashboard with ~30 days of demo runs.

`supabase/migrations/0001_campaign_controls.sql` adds `daily_budget`,
`is_starred` and `flag_status` to `creatives`. Nothing in the current UI reads
those columns — the star, flag and budget controls were removed in a later
simplification — but the migration is kept so the columns are there if those
features come back.

The app renders with an empty dataset when the env vars are missing rather than
crashing, so a fresh clone still boots; a banner explains why everything reads
zero.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_TIMEZONE` | Timezone every date filter resolves in (default `America/New_York`) |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # metric + date-range verification (30 checks)
npm run doctor     # diagnose an empty dashboard (see below)
npm run typecheck  # tsc --noEmit
npm run lint
```

## Showing $0.00 when Supabase has data?

Run `npm run doctor`. It checks the env vars, reachability, per-table row
visibility, the `runs → creatives → offers/bc_accounts` join, the date span of
your runs, and replays the page's own query for each preset range.

The usual causes, in order of likelihood:

1. **RLS is blocking the anon key.** This is the nasty one: PostgREST answers a
   blocked table with HTTP `200` and `[]` — *no error* — so it is
   indistinguishable from "no rows in range". Fix by running the policy block at
   the bottom of `supabase/schema.sql`. Pass `SUPABASE_SERVICE_ROLE_KEY=...` to
   the doctor for a definitive verdict.
2. **Env vars missing at build time.** `NEXT_PUBLIC_*` values are inlined when
   Next builds. On Vercel, adding them *after* a deploy changes nothing until
   you redeploy.
3. **The data is outside the window.** The page defaults to **Today**, resolved
   in `NEXT_PUBLIC_APP_TIMEZONE` (not UTC, not the viewer's zone). If your last
   ingest was yesterday, `$0.00` is the correct answer for Today.

The Analytics page now diagnoses cases 1 and 3 inline whenever a window comes
back empty, rather than rendering a bare zero.

## Metrics

Every derived number comes from `lib/metrics.ts`:

| Metric | Formula |
|---|---|
| Network CPA | `ad_spend / network_clicks` |
| TikTok CPA | `ad_spend / tiktok_clicks` |
| Dropoff % | `((tiktok_clicks - network_clicks) / tiktok_clicks) * 100` |
| EPC | `revenue / network_clicks` |
| Profit | `revenue - ad_spend` |
| ROAS | `revenue / ad_spend` |

Two rules the code holds to:

- **Ratios return `null`, never `Infinity` or `NaN`.** A creative with spend but
  no clicks has an *unknown* CPA, not an infinite one, and the UI renders `—`.
- **Ratios are always recomputed from summed totals**, never averaged from
  per-row ratios. Averaging an EPC of $10.00 and an EPC of $0.10 gives $5.05;
  the correct pooled figure is $1.00.

### Colour rules

On the Analytics campaigns table, **profit is the only coloured metric** — green
at or above zero, red below. Spend, revenue, EPC, CPAs and dropoff are plain
text, so the one number that carries a verdict is the one that stands out. ROAS
sits next to profit in muted gray as a secondary read.

The Creatives, Offers and BC Accounts tables still use the fuller scheme in
`lib/tone-rules.ts` (spend red, revenue green, EPC/CPA thresholds at $0.50).
Those thresholds live apart from `lib/metrics.ts` so changing a colour can never
change a calculation.

A `null` metric means *unknown* (a ratio whose denominator was zero). Unknown is
never painted green or red — it renders as a neutral `—`.

### Campaign rows

Each Analytics row is the campaign name with its BC account beneath, an
Active/Paused pill, and the metrics. The pill toggles status straight to
Supabase with an optimistic update, rolling back with an inline message if the
write fails. Clicking anywhere else on the row expands it into that campaign's
runs, with add / edit / delete — the edit and delete controls are text, revealed
on hover or keyboard focus.

Rows sort active first, then by profit descending.

Below the last row, a bold total row sums spend, revenue, profit and
both click counts across the table. **Its ROAS, EPC and CPA are
recomputed from those sums, not averaged across rows** — the same rule the rest
of the app follows, and the only way the total row's ratios can agree with the
spend and revenue printed beside them.

## Date ranges

Presets: This Hour, Today, Yesterday, 7D, 30D, Custom Range. Each resolves a
current period **and** an equal-length preceding period, which is what the chart
overlays and what the KPI delta chips compare against.

Boundaries resolve in `NEXT_PUBLIC_APP_TIMEZONE`, not the server's zone. Vercel
runs in UTC; "Today" means the buyer's trading day. DST is handled — a
spring-forward day is correctly 23 hours long.

### A note on `run_date` vs `created_at`

`runs.run_date` is a `DATE` and has no intra-day resolution, so:

- **Day-level ranges and daily/monthly buckets filter on `run_date`** — the
  business date a run belongs to, regardless of when the row landed.
- **This Hour and hourly buckets use `created_at`**, the only real timestamp in
  the schema.

If you later want true hour-level spend attribution, `runs` needs a proper
`run_at timestamptz` rather than a date.

## Theming

All colour lives in CSS variables in `app/globals.css`; `.dark` on `<html>` swaps
the set. The toggle sits at the bottom of the sidebar and persists to
`localStorage`, with an inline script in `<head>` applying the stored choice
before first paint so there is no flash of the wrong theme.

One green, `#16a34a`, carries every positive signal in both themes — profit
figures, ROAS above break-even, the Active pill label, the revenue line and its
area fill. It is used exactly as specified, one value across both modes.
Measured contrast:

| Pairing | Ratio | |
| --- | --- | --- |
| `#16a34a` on `#181818` (dark text) | 5.39:1 | passes |
| `#16a34a` on `#141f18` (dark Active pill) | 5.14:1 | passes |
| `#16a34a` on `#ffffff` (light text) | 3.30:1 | under 4.5:1 |
| `#16a34a` on `#dcfce7` (light Active pill) | 3.00:1 | under 4.5:1 |

A mid-tone green clears the bar comfortably on the dark surface and sits under
it on white — small text nominally wants 4.5:1, graphics such as the chart
stroke want 3:1 and get it in both modes. Nothing is encoded by the green alone:
profit also carries a sign and a red counterpart, and status also carries its
label, so the light-mode shortfall costs emphasis rather than meaning. Stepping
`:root --profit` / `--profit-strong` one notch darker (`#15803d`, 5.02:1 on
white) is the one-line change if that matters.

`--profit-soft` is a pale **fill**, not the accent, and is deliberately not
`#16a34a`: a colour cannot be legible on itself, so setting the pill's fill and
label to one value renders it as a blank capsule.

`--loss` is stepped per mode (`#dc2626` light, `#ef4444` dark): on `#181818` the
light red falls to 3.91:1.

## Security

ADRIX has no authentication by design, so the browser talks to Supabase with the
anon key and `schema.sql` grants that key full read/write via permissive RLS
policies. **Anyone with the deployed URL can read and modify all rows.** Before
putting real revenue data behind a public URL, either add Supabase Auth and scope
the policies to authenticated users, or enable Vercel password protection.

## Deploying

Push to GitHub, import the repo in Vercel, and set the three environment
variables above. No other configuration is needed.
