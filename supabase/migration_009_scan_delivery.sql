-- ============================================================================
-- Flaiir — Migration 009: per-user scan delivery
-- Central pool stays shared; each user only receives leads ingested up to their
-- last scan. The scan timer (by tier) advances last_scan_at and releases the
-- batch they don't have yet.
--   * leads.created_at  — ingestion time we gate on (posted_date can be backdated)
--   * profiles.last_scan_at — high-water mark of what a user has received
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

alter table public.leads add column if not exists created_at timestamptz default now();
create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.profiles add column if not exists last_scan_at timestamptz default now();
