-- ADRIX schema
-- Run this in the Supabase SQL editor (or `supabase db push`) before starting the app.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  glitchy_offer_id text unique not null,
  name text not null,
  payout numeric default 0,
  created_at timestamptz default now()
);

create table if not exists bc_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tiktok_bc_id text,
  type text check (type in ('owned', 'rented')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists creatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  offer_id uuid references offers(id),
  bc_account_id uuid references bc_accounts(id),
  status text check (status in ('active', 'paused')) default 'active',
  created_at timestamptz default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid references creatives(id) on delete cascade,
  run_date date not null,
  ad_spend numeric default 0,
  revenue numeric default 0,
  tiktok_clicks integer default 0,
  network_clicks integer default 0,
  status text check (status in ('active', 'paused')) default 'active',
  created_at timestamptz default now()
);

create table if not exists offer_stats (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(id),
  stat_date date not null,
  revenue numeric default 0,
  clicks integer default 0,
  conversions integer default 0,
  epc numeric default 0,
  created_at timestamptz default now(),
  unique(offer_id, stat_date)
);

-- ---------------------------------------------------------------------------
-- Indexes — the War Room filters on date constantly.
-- ---------------------------------------------------------------------------

create index if not exists runs_run_date_idx on runs (run_date desc);
create index if not exists runs_creative_id_idx on runs (creative_id);
create index if not exists runs_created_at_idx on runs (created_at desc);
create index if not exists creatives_offer_id_idx on creatives (offer_id);
create index if not exists creatives_bc_account_id_idx on creatives (bc_account_id);
create index if not exists offer_stats_stat_date_idx on offer_stats (stat_date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- ADRIX ships without authentication by design, so the browser talks to
-- Supabase with the anon key. RLS is enabled with fully permissive policies so
-- that key can read and write.
--
-- SECURITY NOTE: this means anyone holding the anon key (which is shipped to
-- the browser) can read and modify all rows. That is an accepted consequence of
-- the "no auth" requirement. Before putting real revenue data behind a public
-- URL, either add Supabase Auth and scope these policies to authenticated
-- users, or put the deployment behind Vercel password protection.
-- ---------------------------------------------------------------------------

alter table offers enable row level security;
alter table bc_accounts enable row level security;
alter table creatives enable row level security;
alter table runs enable row level security;
alter table offer_stats enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['offers', 'bc_accounts', 'creatives', 'runs', 'offer_stats']
  loop
    execute format('drop policy if exists %I on %I', 'anon_all_' || t, t);
    execute format(
      'create policy %I on %I for all to anon, authenticated using (true) with check (true)',
      'anon_all_' || t, t
    );
  end loop;
end $$;
