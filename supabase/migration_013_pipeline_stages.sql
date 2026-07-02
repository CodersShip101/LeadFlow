-- ============================================================================
-- Flaiir — Migration 013: full pipeline workflow
--  The board grows from 3 stages to 5: interested → applied → in_talks →
--  hired (Won), plus lost. This migration makes the database accept the new
--  statuses and adds stage_changed_at so staleness is measured from the last
--  stage move, not from when the lead first entered the pipeline.
-- Idempotent — safe to run more than once.
-- ============================================================================

-- 1) Normalise any legacy stage values before tightening the constraint.
update public.applications set status = 'hired' where status = 'won';

-- 2) Replace whatever CHECK constraint exists on applications.status (name
--    unknown — the table predates the repo's migration files) with one that
--    includes the new stages. No-op if no constraint exists.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'applications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.applications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.applications
  add constraint applications_status_check
  check (status in ('saved', 'interested', 'applied', 'in_talks', 'hired', 'lost'));

-- 3) Track when a lead last moved stage (backfilled from created_at).
alter table public.applications add column if not exists stage_changed_at timestamptz;
update public.applications set stage_changed_at = created_at where stage_changed_at is null;
alter table public.applications alter column stage_changed_at set default now();
