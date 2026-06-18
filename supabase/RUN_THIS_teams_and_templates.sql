-- ============================================================================
-- Flaiir — Teams + Templates setup (clean, run-once)
-- Paste this ENTIRE file into Supabase → SQL Editor and click Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- ─────────────────────────── ORGANIZATIONS ───────────────────────────
create table if not exists public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  plan                   text not null default 'team' check (plan in ('team','enterprise')),
  seats                  integer not null default 1,
  stripe_customer_id     text,
  stripe_subscription_id text,
  owner_id               uuid not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members (user_id);

create table if not exists public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('admin','member')),
  token       text not null unique default encode(gen_random_bytes(16),'hex'),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists org_invites_email_idx on public.org_invites (email);

alter table public.applications
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id);
create index if not exists applications_org_idx on public.applications (org_id);

-- ─────────────────────────── FUNCTIONS ───────────────────────────
create or replace function public.user_org(p_user uuid)
returns table(org_id uuid, role text, plan text, seats integer)
language sql security definer stable set search_path = public as $$
  select m.org_id, m.role, o.plan, o.seats
  from public.org_members m
  join public.organizations o on o.id = m.org_id
  where m.user_id = p_user
  limit 1;
$$;

create or replace function public.org_seat_usage(p_org uuid)
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.org_members where org_id = p_org;
$$;

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
  select * into inv from public.org_invites where token = p_token and accepted_at is null;
  if inv is null then return json_build_object('error','invalid or used invite'); end if;
  if lower(inv.email) <> lower(uemail) then return json_build_object('error','invite is for a different email'); end if;
  select seats into org_seats from public.organizations where id = inv.org_id;
  select public.org_seat_usage(inv.org_id) into seat_count;
  if seat_count >= org_seats then return json_build_object('error','no seats available'); end if;
  insert into public.org_members (org_id, user_id, role) values (inv.org_id, uid, inv.role) on conflict (org_id, user_id) do nothing;
  update public.org_invites set accepted_at = now() where id = inv.id;
  return json_build_object('ok', true, 'org_id', inv.org_id);
end; $$;

-- ─────────────────────────── RLS ───────────────────────────
alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;
alter table public.org_invites   enable row level security;

drop policy if exists "org - members read" on public.organizations;
create policy "org - members read" on public.organizations
  for select using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.user_id = auth.uid()));

drop policy if exists "org - admins update" on public.organizations;
create policy "org - admins update" on public.organizations
  for update using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'));

drop policy if exists "org - owner insert" on public.organizations;
create policy "org - owner insert" on public.organizations
  for insert with check (owner_id = auth.uid());

drop policy if exists "members - read same org" on public.org_members;
create policy "members - read same org" on public.org_members
  for select using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

drop policy if exists "members - admin manage" on public.org_members;
create policy "members - admin manage" on public.org_members
  for all using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin'))
  with check (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin'));

drop policy if exists "invites - admin manage" on public.org_invites;
create policy "invites - admin manage" on public.org_invites
  for all using (exists (select 1 from public.org_members m where m.org_id = org_invites.org_id and m.user_id = auth.uid() and m.role = 'admin'))
  with check (exists (select 1 from public.org_members m where m.org_id = org_invites.org_id and m.user_id = auth.uid() and m.role = 'admin'));

-- ─────────────────────────── TEMPLATES ───────────────────────────
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists templates_owner_idx on public.templates(owner_id);
create index if not exists templates_org_idx on public.templates(org_id);

alter table public.templates enable row level security;

drop policy if exists "templates_select" on public.templates;
create policy "templates_select" on public.templates
  for select using (
    owner_id = auth.uid()
    or (org_id is not null and exists (select 1 from public.org_members m where m.org_id = templates.org_id and m.user_id = auth.uid()))
  );

drop policy if exists "templates_insert" on public.templates;
create policy "templates_insert" on public.templates
  for insert with check (
    owner_id = auth.uid()
    and (org_id is null or exists (select 1 from public.org_members m where m.org_id = templates.org_id and m.user_id = auth.uid()))
  );

drop policy if exists "templates_update" on public.templates;
create policy "templates_update" on public.templates for update using (owner_id = auth.uid());

drop policy if exists "templates_delete" on public.templates;
create policy "templates_delete" on public.templates for delete using (owner_id = auth.uid());
