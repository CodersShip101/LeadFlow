-- ============================================================================
-- Team Slack notifications — store an incoming webhook URL per organization.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================================
alter table public.organizations
  add column if not exists slack_webhook_url text;
