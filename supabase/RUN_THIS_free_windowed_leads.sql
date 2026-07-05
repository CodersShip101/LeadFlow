-- Free-plan windowed leads: per-user weekly delivery counter.
-- Safe to re-run.
alter table public.profiles
  add column if not exists leads_week_count integer not null default 0;
alter table public.profiles
  add column if not exists leads_week_anchor timestamptz;
