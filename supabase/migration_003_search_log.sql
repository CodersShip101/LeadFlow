-- ============================================================================
-- LeadFlow — Migration 003: Search log + popular searches
-- Powers the "smarter search" suggestions in the dashboard top bar (UXUI
-- Playbook, Top 5 Part 3 #2 — surface recent + popular on focus):
--   • recent searches per user        → GET  /api/search/suggest
--   • popular searches across users    → public.popular_searches() RPC
--   • logging a search                 → POST /api/search/suggest
-- The /api/search/suggest route degrades gracefully if this isn't applied yet
-- (recent falls back to localStorage, popular to a static list).
-- Run AFTER schema.sql, in the Supabase dashboard SQL editor.
-- ============================================================================

-- 1. Per-user search history.
create table if not exists public.search_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  query      text not null,
  created_at timestamptz not null default now()
);
create index if not exists search_log_user_idx    on public.search_log (user_id, created_at desc);
create index if not exists search_log_created_idx  on public.search_log (created_at desc);

-- 2. RLS — a user may only read and write their own history.
alter table public.search_log enable row level security;

create policy "search_log - own read" on public.search_log
  for select using (user_id = auth.uid());
create policy "search_log - own insert" on public.search_log
  for insert with check (user_id = auth.uid());

-- 3. Aggregate the most common recent queries across all users.
--    security definer so it can count beyond the caller's RLS scope, but it
--    only ever returns anonymised query text + counts (never user ids).
create or replace function public.popular_searches(days int default 7, lim int default 3)
returns table(query text, count bigint)
language sql security definer stable set search_path = public as $$
  select query, count(*)::bigint as count
  from public.search_log
  where created_at >= now() - make_interval(days => days)
    and length(trim(query)) >= 2
  group by query
  order by count desc, max(created_at) desc
  limit lim;
$$;
