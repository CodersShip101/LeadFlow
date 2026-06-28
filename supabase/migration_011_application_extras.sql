-- ============================================================================
-- Flaiir — Migration 011: application follow-ups + personal notes
-- Adds the columns the reminders feature needs (these were never applied here,
-- which is why the applications query was failing) plus a free-text note the
-- saved page uses for "why I saved this". Idempotent.
-- ============================================================================

alter table public.applications add column if not exists follow_up_at   timestamptz;
alter table public.applications add column if not exists follow_up_note text;
alter table public.applications add column if not exists note           text;
