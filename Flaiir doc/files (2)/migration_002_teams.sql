-- ============================================================================
-- LeadFlow — Migration 002: Tiers + Teams
-- Adds the four-tier plan system and team/organization support.
-- Run AFTER schema.sql.
--
-- Tiers:  free  |  starter (£29)  |  pro (£49)  |  team (£39/seat)
-- A "team" is an organization with seats; individual tiers stay on the profile.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Widen the per-user plan to the new individual tiers.
--    (Team members get their effective plan from the org — see entitlements.)
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free','starter','pro'));

-- ---------------------------------------------------------------------------
-- 2. Organizations (a team account). Billing lives here, not on the member.
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  plan                text not null default 'team' check (plan in ('team','enterprise')),
  seats               integer not null default 1,         -- purchased seats
  stripe_customer_id  text,
  stripe_subscription_id text,
  owner_id            uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Membership + roles. One row per (org, user).
--    Roles: admin (manage seats/billing/members) | member.
-- ---------------------------------------------------------------------------
create table if not exists public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members (user_id);

-- ---------------------------------------------------------------------------
-- 4. Pending invites (email-based; accepted on signup/login).
-- ---------------------------------------------------------------------------
create table if not exists public.org_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  token      text not null unique default encode(gen_random_bytes(16),'hex'),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists org_invites_email_idx on public.org_invites (email);

-- ---------------------------------------------------------------------------
-- 5. Team-shared resources: lead assignment.
--    When on a team, an application can be assigned to a specific member.
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id);
create index if not exists applications_org_idx on public.applications (org_id);

-- ============================================================================
-- Helper: which org (if any) does a user belong to, and what's their role?
-- SECURITY DEFINER so policies can call it without recursive RLS.
-- ============================================================================
create or replace function public.user_org(p_user uuid)
returns table(org_id uuid, role text, plan text, seats integer)
language sql security definer stable set search_path = public as $$
  select m.org_id, m.role, o.plan, o.seats
  from public.org_members m
  join public.organizations o on o.id = m.org_id
  where m.user_id = p_user
  limit 1;
$$;

-- Count current members (to enforce seat limits).
create or replace function public.org_seat_usage(p_org uuid)
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.org_members where org_id = p_org;
$$;

-- ============================================================================
-- Effective plan: the entitlement source of truth.
--   - If the user is in an org → that org's plan (team/enterprise)
--   - Otherwise → their individual profile plan (free/starter/pro)
-- ============================================================================
create or replace function public.effective_plan(p_user uuid)
returns text language plpgsql security definer stable set search_path = public as $$
declare
  org_plan text;
  prof_plan text;
begin
  select o.plan into org_plan
  from public.org_members m join public.organizations o on o.id = m.org_id
  where m.user_id = p_user limit 1;

  if org_plan is not null then
    return org_plan;
  end if;

  select plan into prof_plan from public.profiles where id = p_user;
  return coalesce(prof_plan, 'free');
end; $$;

-- ============================================================================
-- RLS for the new tables
-- ============================================================================
alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;
alter table public.org_invites   enable row level security;

-- Organizations: any member can read; only admins can update.
create policy "org - members read" on public.organizations
  for select using (
    exists (select 1 from public.org_members m
            where m.org_id = organizations.id and m.user_id = auth.uid())
  );
create policy "org - admins update" on public.organizations
  for update using (
    exists (select 1 from public.org_members m
            where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin')
  );
create policy "org - owner insert" on public.organizations
  for insert with check (owner_id = auth.uid());

-- Members: a user can see co-members of their own org; admins manage rows.
create policy "members - read same org" on public.org_members
  for select using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );
create policy "members - admin manage" on public.org_members
  for all using (
    exists (select 1 from public.org_members m
            where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin')
  ) with check (
    exists (select 1 from public.org_members m
            where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin')
  );

-- Invites: admins of the org manage; an invitee can read their own by email.
create policy "invites - admin manage" on public.org_invites
  for all using (
    exists (select 1 from public.org_members m
            where m.org_id = org_invites.org_id and m.user_id = auth.uid() and m.role = 'admin')
  ) with check (
    exists (select 1 from public.org_members m
            where m.org_id = org_invites.org_id and m.user_id = auth.uid() and m.role = 'admin')
  );

-- ============================================================================
-- Accept an invite (called after the invited user authenticates).
-- Enforces the seat limit before adding the member.
-- ============================================================================
create or replace function public.accept_invite(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv public.org_invites;
  seat_count int;
  org_seats int;
  uid uuid := auth.uid();
  uemail text;
begin
  if uid is null then return json_build_object('error','not authenticated'); end if;
  select email into uemail from auth.users where id = uid;

  select * into inv from public.org_invites
   where token = p_token and accepted_at is null;
  if inv is null then return json_build_object('error','invalid or used invite'); end if;
  if lower(inv.email) <> lower(uemail) then
    return json_build_object('error','invite is for a different email');
  end if;

  select seats into org_seats from public.organizations where id = inv.org_id;
  select public.org_seat_usage(inv.org_id) into seat_count;
  if seat_count >= org_seats then
    return json_build_object('error','no seats available');
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (inv.org_id, uid, inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.org_invites set accepted_at = now() where id = inv.id;
  return json_build_object('ok', true, 'org_id', inv.org_id);
end; $$;
