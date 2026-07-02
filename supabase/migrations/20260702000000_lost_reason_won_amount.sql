-- ============================================================================
-- Flaiir — Migration 014: pipeline outcome detail
--  lost_reason  — one-tap reason captured when a deal is marked lost, powering
--                 the "why you lose" breakdown in Analytics.
--  won_amount   — confirmed deal value captured when a deal is won, so
--                 Analytics can report real revenue instead of listed budgets.
-- Idempotent.
-- ============================================================================

alter table public.applications add column if not exists lost_reason text;
alter table public.applications add column if not exists won_amount  numeric;
