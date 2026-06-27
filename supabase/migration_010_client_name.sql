-- ============================================================================
-- Flaiir — Migration 010: store the AI-extracted client/company name
-- The detail panel showed a brittle regex guess; the AI already extracts a clean
-- client_name, so persist it and use it as the source of truth. Idempotent.
-- ============================================================================

alter table public.leads add column if not exists client_name text;
