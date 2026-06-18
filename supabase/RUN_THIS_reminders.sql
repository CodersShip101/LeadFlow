-- ============================================================================
-- Follow-up reminders + calendar sync
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================================

-- Per-application follow-up reminder
alter table public.applications
  add column if not exists follow_up_at   timestamptz,
  add column if not exists follow_up_note text;

-- Per-user secret token for the private iCal feed
alter table public.profiles
  add column if not exists calendar_token text unique default encode(gen_random_bytes(16),'hex');

-- Backfill tokens for existing users that don't have one
update public.profiles
  set calendar_token = encode(gen_random_bytes(16),'hex')
  where calendar_token is null;
