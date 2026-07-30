# ADRIX

Performance tracking for affiliate media buyers. Dark-only, dense, built to be
read at a glance like a trading terminal.

Next.js 14 (App Router) · Supabase · shadcn/ui · Recharts · Tailwind · Geist.
No authentication.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Then create the schema in your Supabase project — paste `supabase/schema.sql`
into the SQL editor and run it. `supabase/seed.sql` is optional and fills the
dashboard with ~30 days of demo runs.

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
npm run typecheck  # tsc --noEmit
npm run lint
```

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

Spend is always red and Revenue always green — they are directional quantities,
not judgements, and the fixed colour makes the pair scannable. The other three
are conditional: Profit is green above zero, ROAS above `1.00x` (break-even, not
zero), and EPC when it clears Network CPA — i.e. you earn more per network click
than the click costs.

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

## Chart colours

The current-period series is `#8b5cf6` rather than the UI accent `#7c3aed`: on a
`#0a0a0a` surface a 2px stroke at `#7c3aed` sits at the edge of the 3:1 contrast
floor, and one step up the violet ramp clears it while reading as the same hue.
`#7c3aed` remains the interactive accent (buttons, active nav, focus rings).

The previous-period series is a recessive neutral with a dash pattern, so the two
lines are never distinguished by colour alone. Validated on the `#0a0a0a`
surface: CVD separation ΔE 20.8, normal-vision ΔE 21.8, both series ≥ 3:1.

## Security

ADRIX has no authentication by design, so the browser talks to Supabase with the
anon key and `schema.sql` grants that key full read/write via permissive RLS
policies. **Anyone with the deployed URL can read and modify all rows.** Before
putting real revenue data behind a public URL, either add Supabase Auth and scope
the policies to authenticated users, or enable Vercel password protection.

## Deploying

Push to GitHub, import the repo in Vercel, and set the three environment
variables above. No other configuration is needed.
