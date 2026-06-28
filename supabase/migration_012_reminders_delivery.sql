-- ============================================================================
-- Flaiir — Migration 012: make reminders actually notify
--  1) profiles.calendar_token  — enables the private iCal feed (/api/calendar)
--     and the "Calendar sync" card in Settings (code already exists; the column
--     was just never created). Backfilled for every existing profile.
--  2) applications.follow_up_notified_at — so the daily email dispatch sends each
--     reminder once (reset whenever the user sets a new follow-up).
-- Idempotent.
-- ============================================================================

alter table public.profiles add column if not exists calendar_token text;
update public.profiles set calendar_token = gen_random_uuid()::text where calendar_token is null;
create unique index if not exists profiles_calendar_token_key on public.profiles(calendar_token);

alter table public.applications add column if not exists follow_up_notified_at timestamptz;
