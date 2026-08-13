-- Scaler demo seed data.
-- Optional: run after schema.sql to get a War Room with something in it.
-- Generates ~30 days of runs across 14 creatives, with created_at spread over
-- the hours of each day so the Hourly chart granularity has real shape.

truncate table runs, offer_stats, creatives, bc_accounts, offers restart identity cascade;

insert into offers (glitchy_offer_id, name, payout) values
  ('GL-1001', 'Solar Quote — US', 42.50),
  ('GL-1002', 'Medicare Advantage', 68.00),
  ('GL-1003', 'Auto Insurance Rate Check', 31.25),
  ('GL-1004', 'Debt Relief Program', 55.00),
  ('GL-1005', 'Home Warranty', 27.75),
  ('GL-1006', 'Final Expense Life', 74.00);

insert into bc_accounts (name, tiktok_bc_id, type, is_active) values
  ('Apex Media BC',      '7291045512340001', 'owned',  true),
  ('Northwind Agency',   '7291045512340002', 'rented', true),
  ('Sable Digital BC',   '7291045512340003', 'owned',  true),
  ('Harbor Reach (old)', '7291045512340004', 'rented', false);

do $$
declare
  offer_ids uuid[];
  bc_ids uuid[];
  creative_names text[] := array[
    'UGC Testimonial v3', 'Green Screen Hook A', 'Split Screen Compare',
    'Street Interview 15s', 'Voiceover Explainer', 'Before/After Bills',
    'Grandma Reacts', 'Whiteboard Savings', 'POV Homeowner',
    'Text Overlay Rapid', 'Selfie Confession', 'News Style Cut',
    'Duet Reaction', 'Hook Test — Retired?'
  ];
  cid uuid;
  i int;
  d date;
  h int;
  runs_today int;
  spend numeric;
  rev numeric;
  tt int;
  nw int;
  quality numeric;
begin
  select array_agg(id order by glitchy_offer_id) into offer_ids from offers;
  select array_agg(id order by name) into bc_ids from bc_accounts where is_active;

  for i in 1..array_length(creative_names, 1) loop
    insert into creatives (
      name, offer_id, bc_account_id, status,
      daily_budget, is_starred, flag_status
    )
    values (
      creative_names[i],
      offer_ids[1 + (i % array_length(offer_ids, 1))],
      bc_ids[1 + (i % array_length(bc_ids, 1))],
      case when i % 5 = 0 then 'paused' else 'active' end,
      round((150 + random() * 350)::numeric, 0),
      i % 6 = 0,
      case i % 4 when 0 then 'testing' when 1 then 'scaling' else 'none' end
    )
    returning id into cid;

    -- Each creative gets a persistent "quality" so winners stay winners.
    quality := 0.75 + random() * 0.85;

    for d in select generate_series(current_date - 29, current_date, '1 day')::date loop
      runs_today := 1 + floor(random() * 3)::int;

      for h in 1..runs_today loop
        spend := round((40 + random() * 260)::numeric, 2);
        tt    := floor(spend * (2.5 + random() * 2))::int;
        nw    := floor(tt * (0.55 + random() * 0.33))::int;
        rev   := round((spend * quality * (0.7 + random() * 0.8))::numeric, 2);

        insert into runs (
          creative_id, run_date, ad_spend, revenue,
          tiktok_clicks, network_clicks, status, created_at
        )
        values (
          cid, d, spend, rev, tt, nw,
          case when i % 5 = 0 then 'paused' else 'active' end,
          -- spread across the working hours of that day
          (d + (floor(random() * 24) || ' hours')::interval
             + (floor(random() * 60) || ' minutes')::interval)::timestamptz
        );
      end loop;
    end loop;
  end loop;

  -- Offer-level stats, derived independently of creative runs.
  for i in 1..array_length(offer_ids, 1) loop
    for d in select generate_series(current_date - 29, current_date, '1 day')::date loop
      insert into offer_stats (offer_id, stat_date, revenue, clicks, conversions, epc)
      values (
        offer_ids[i],
        d,
        round((400 + random() * 2600)::numeric, 2),
        floor(300 + random() * 2200)::int,
        floor(5 + random() * 70)::int,
        0
      )
      on conflict (offer_id, stat_date) do nothing;
    end loop;
  end loop;

  update offer_stats set epc = round(revenue / nullif(clicks, 0), 4) where clicks > 0;
end $$;
