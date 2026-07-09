-- Seat change history: one row per confirmed seat change on a team.
-- Powers the "Recent seat changes" timeline. Safe to re-run.
create table if not exists public.seat_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  from_seats integer not null,
  to_seats integer not null,
  created_at timestamptz not null default now()
);
create index if not exists seat_events_org_idx on public.seat_events(org_id, created_at desc);
