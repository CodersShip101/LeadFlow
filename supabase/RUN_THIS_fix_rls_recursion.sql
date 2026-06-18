-- ============================================================================
-- Fix: infinite recursion in org_members RLS policies.
-- Policies that query org_members from within an org_members policy recurse.
-- Solution: SECURITY DEFINER helper functions (they bypass RLS internally).
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================================

create or replace function public.is_member_of(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = p_org and user_id = auth.uid() and role = 'admin');
$$;

-- ── org_members (the recursive ones) ──
drop policy if exists "members - read same org" on public.org_members;
create policy "members - read same org" on public.org_members
  for select using (user_id = auth.uid() or public.is_member_of(org_id));

drop policy if exists "members - admin manage" on public.org_members;
create policy "members - admin manage" on public.org_members
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- ── organizations ──
drop policy if exists "org - members read" on public.organizations;
create policy "org - members read" on public.organizations
  for select using (public.is_member_of(id));

drop policy if exists "org - admins update" on public.organizations;
create policy "org - admins update" on public.organizations
  for update using (public.is_org_admin(id));

-- ── org_invites ──
drop policy if exists "invites - admin manage" on public.org_invites;
create policy "invites - admin manage" on public.org_invites
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- ── templates (referenced org_members → also affected) ──
drop policy if exists "templates_select" on public.templates;
create policy "templates_select" on public.templates
  for select using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_member_of(org_id))
  );

drop policy if exists "templates_insert" on public.templates;
create policy "templates_insert" on public.templates
  for insert with check (
    owner_id = auth.uid()
    and (org_id is null or public.is_member_of(org_id))
  );
