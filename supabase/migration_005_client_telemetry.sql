-- ============================================================================
-- LeadFlow — Migration 005: Client telemetry & trust infrastructure
-- Powers the Goodside detail-panel section: trust badges, hire rate, avg
-- spend, response-time tracking.
-- Run AFTER schema.sql + migrations 002–004, in the Supabase SQL editor.
-- ============================================================================

-- 1. EXTENDED CLIENT PROFILES (for clients who post projects directly)
--    is_payment_verified + stripe_customer_id link to payment provider.
create table if not exists public.client_profiles (
  client_id         uuid primary key references auth.users(id) on delete cascade,
  company_name      text,
  company_website   text,
  is_payment_verified boolean not null default false,
  stripe_customer_id  text unique,
  avg_response_mins integer not null default 0,    -- computed from proposal reads
  total_posted      integer not null default 0,
  total_hired       integer not null default 0,
  total_spent       numeric(10,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2. PROJECTS (job posts with contract-type & scope completeness)
create type public.contract_type_enum as enum ('FIXED_PRICE', 'HOURLY', 'MILESTONE');
create type public.project_status_enum as enum ('OPEN', 'HIRED', 'EXPIRED', 'CANCELLED');

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.client_profiles(client_id) on delete cascade,
  title             text not null,
  description       text not null,
  contract_type     public.contract_type_enum not null default 'FIXED_PRICE',
  budget_allocated  numeric(10,2),
  status            public.project_status_enum not null default 'OPEN',
  -- Scope completeness score (1-4):
  --   1 = deliverables defined
  --   2 = + timeline
  --   3 = + technical stack
  --   4 = + revision limits
  scope_score       integer not null default 1 check (scope_score between 1 and 4),
  is_escrow_funded  boolean not null default false,
  source            text default 'direct',          -- 'direct' | 'reddit' | 'reed' | etc
  source_url        text,
  created_at        timestamptz not null default now(),
  closed_at         timestamptz
);

create index if not exists projects_client_idx on public.projects (client_id, status);
create index if not exists projects_status_idx on public.projects (status, created_at desc);

-- 3. PROPOSALS (freelancer bids; tracks response time for client telemetry)
create table if not exists public.proposals (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  freelancer_id     uuid not null references auth.users(id) on delete cascade,
  cover_letter      text,
  proposed_amount   numeric(10,2),
  status            text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  submitted_at      timestamptz not null default now(),
  client_read_at    timestamptz                      -- set when client opens the proposal
);

create index if not exists proposals_project_idx on public.proposals (project_id, status);
create index if not exists proposals_freelancer_idx on public.proposals (freelancer_id);

-- 4. CONTRACTS (successful hires; tracks escrow + final payout)
create table if not exists public.contracts (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  client_id         uuid not null references public.client_profiles(client_id),
  freelancer_id     uuid not null references auth.users(id),
  final_payout      numeric(10,2),
  is_escrow_funded  boolean not null default false,
  hired_at          timestamptz not null default now(),
  completed_at      timestamptz,
  unique (project_id)
);

-- 5. CLIENT TELEMETRY MATERIALIZED VIEW
--    Recalculates hire-rate, avg spend, avg response-time per client.
--    Refresh via: REFRESH MATERIALIZED VIEW client_telemetry;
create materialized view if not exists public.client_telemetry as
select
  cp.client_id,
  cp.company_name,
  cp.is_payment_verified,
  cp.stripe_customer_id is not null as has_payment_method,
  coalesce(cp.total_hired, 0) as total_hired,
  coalesce(cp.total_posted, 0) as total_posted,
  case
    when cp.total_posted > 0
    then round((cp.total_hired::numeric / cp.total_posted) * 100, 1)
    else 0
  end as hire_rate_pct,
  coalesce(cp.total_spent, 0) as total_spent,
  coalesce(cp.avg_response_mins, 0) as avg_response_mins
from public.client_profiles cp;

create unique index if not exists client_telemetry_pkey on public.client_telemetry (client_id);

-- 6. ROW LEVEL SECURITY
alter table public.client_profiles enable row level security;
alter table public.projects        enable row level security;
alter table public.proposals       enable row level security;
alter table public.contracts       enable row level security;

-- Clients manage their own profile
create policy "client_profile - own all" on public.client_profiles
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- Any authed user can read client profiles (for trust display)
create policy "client_profile - readable by all" on public.client_profiles
  for select using (auth.role() = 'authenticated');

-- Projects: client owns, freelancers can read open projects
create policy "projects - client manage" on public.projects
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "projects - freelancer read open" on public.projects
  for select using (status = 'OPEN' and auth.role() = 'authenticated');

-- Proposals: freelancer owns their own; client can see proposals on their projects
create policy "proposals - freelancer own" on public.proposals
  for all using (freelancer_id = auth.uid()) with check (freelancer_id = auth.uid());
create policy "proposals - client on own projects" on public.proposals
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- Contracts: involved parties can read
create policy "contracts - involved read" on public.contracts
  for select using (
    auth.uid() = client_id or auth.uid() = freelancer_id or
    exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  );
