-- Pitch / application templates
-- Solo (Pro): personal templates. Team: templates with an org_id are shared
-- with the whole organisation (the "shared pitch & template library").

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

-- Read: your own templates, or any template shared with an org you belong to.
create policy "templates_select" on public.templates
  for select using (
    owner_id = auth.uid()
    or (
      org_id is not null
      and exists (
        select 1 from public.org_members m
        where m.org_id = templates.org_id and m.user_id = auth.uid()
      )
    )
  );

-- Insert: only as yourself; if shared to an org, you must be a member.
create policy "templates_insert" on public.templates
  for insert with check (
    owner_id = auth.uid()
    and (
      org_id is null
      or exists (
        select 1 from public.org_members m
        where m.org_id = templates.org_id and m.user_id = auth.uid()
      )
    )
  );

-- Update / delete: the creator manages their template.
create policy "templates_update" on public.templates
  for update using (owner_id = auth.uid());
create policy "templates_delete" on public.templates
  for delete using (owner_id = auth.uid());
