-- Campaign controls: per-creative budget, starring, and flag state.
-- Safe to run against an existing database.

alter table creatives add column if not exists daily_budget numeric default 0;
alter table creatives add column if not exists is_starred boolean default false;
alter table creatives add column if not exists flag_status text default 'none';

-- Keep flag_status to the three states the UI cycles through.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creatives_flag_status_check'
  ) then
    alter table creatives
      add constraint creatives_flag_status_check
      check (flag_status in ('none', 'testing', 'scaling'));
  end if;
end $$;

-- Starred rows float to the top of the campaigns table.
create index if not exists creatives_is_starred_idx on creatives (is_starred);
