-- ============================================================================
-- Flaiir — Migration 008: richer lead detail
-- Adds AI-extracted responsibilities (tasks/duties) and benefits to leads so the
-- detail panel can show structured role info. Run in the Supabase SQL editor.
-- Idempotent.
-- ============================================================================

alter table public.leads add column if not exists responsibilities jsonb default '[]'::jsonb;
alter table public.leads add column if not exists benefits         jsonb default '[]'::jsonb;
