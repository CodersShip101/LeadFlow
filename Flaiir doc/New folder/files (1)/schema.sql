-- ============================================================================
-- LeadFlow — Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Tables: profiles, leads, applications, saved_leads, search_log
-- Everything user-owned is protected by Row Level Security.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- segment + activity counters power the "personalize by behaviour" rule.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  location        text,
  hourly_rate     integer,                       -- in GBP
  experience      text check (experience in ('junior','mid','senior','lead')),
  availability    text,
  skills          text[] default '{}',           -- e.g. {React,TypeScript}
  plan            text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id text,
  -- activity signals (denormalised counters, cheap to read on every request)
  applications_this_month integer not null default 0,
  applications_total      integer not null default 0,
  days_active             integer not null default 0,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads  (shared catalogue produced by the scrapers; readable by all signed-in)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  source        text not null check (source in ('reddit','reed','wwr','rok')),
  source_url    text not null,
  title         text not null,
  description   text,
  budget_text   text,                            -- raw "£400–500/day"
  budget_min    integer,                         -- parsed daily rate for scoring
  budget_max    integer,
  location      text,
  project_type  text,
  required_skills text[] default '{}',
  ir35          text check (ir35 in ('inside','outside','unknown')) default 'unknown',
  posted_at     timestamptz not null,
  applicants    integer default 0,               -- social-proof count
  detail_score  integer default 5,               -- 0-10 listing completeness
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists leads_source_idx     on public.leads (source);
create index if not exists leads_posted_idx      on public.leads (posted_at desc);
create index if not exists leads_skills_idx       on public.leads using gin (required_skills);

-- ---------------------------------------------------------------------------
-- applications  (pipeline: interested -> applied -> won/lost)
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  stage       text not null default 'interested'
                check (stage in ('interested','applied','won','lost')),
  note        text,
  outcome_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, lead_id)
);
create index if not exists applications_user_idx on public.applications (user_id, stage);

-- ---------------------------------------------------------------------------
-- saved_leads  (bookmarks)
-- ---------------------------------------------------------------------------
create table if not exists public.saved_leads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lead_id)
);

-- ---------------------------------------------------------------------------
-- search_log  (feeds "recent" + aggregate "popular" search suggestions)
-- ---------------------------------------------------------------------------
create table if not exists public.search_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  query      text not null,
  created_at timestamptz not null default now()
);
create index if not exists search_log_user_idx on public.search_log (user_id, created_at desc);
create index if not exists search_log_query_idx on public.search_log (query);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.leads         enable row level security;
alter table public.applications  enable row level security;
alter table public.saved_leads   enable row level security;
alter table public.search_log    enable row level security;

-- profiles: a user sees and edits only their own row
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);
create policy "own profile - insert" on public.profiles
  for insert with check (auth.uid() = id);

-- leads: any authenticated user can read the catalogue; writes are service-role only
create policy "leads readable by authed" on public.leads
  for select using (auth.role() = 'authenticated');

-- applications: strictly per-user
create policy "own applications - all" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_leads: strictly per-user
create policy "own saved - all" on public.saved_leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- search_log: strictly per-user for reads/writes; popular aggregation runs via RPC (below)
create policy "own search - all" on public.search_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Auto-create a profile row when a new auth user signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Popular searches (aggregate, last 7 days) — exposed as a SECURITY DEFINER RPC
-- so it can read across users without leaking individual rows.
-- ============================================================================
create or replace function public.popular_searches(days int default 7, lim int default 5)
returns table(query text, n bigint)
language sql security definer set search_path = public as $$
  select query, count(*) as n
  from public.search_log
  where created_at > now() - (days || ' days')::interval
  group by query
  order by n desc
  limit lim;
$$;

-- Monthly application-count reset (call from a scheduled job / pg_cron)
create or replace function public.reset_monthly_quota()
returns void language sql security definer set search_path = public as $$
  update public.profiles set applications_this_month = 0;
$$;

-- Atomic application-counter increment (used by /api/apply)
create or replace function public.increment_application_counters(p_user uuid)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set applications_this_month = applications_this_month + 1,
         applications_total      = applications_total + 1,
         updated_at              = now()
   where id = p_user;
$$;
