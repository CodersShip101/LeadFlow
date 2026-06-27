-- ============================================================================
-- Flaiir — Run this in the Supabase SQL editor to enable the automatic scraper.
-- Combines migration_006_harvester.sql + migration_007_lead_integrity.sql.
-- Safe to run more than once (idempotent). Order matters: 006 first, then 007.
-- ============================================================================

-- ─── 006: Harvester v2 — fingerprint dedup + per-source monitoring ──────────

-- 1. Fingerprint for cross-source deduplication
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Backfill fingerprints for existing rows
UPDATE leads
SET fingerprint = encode(
  sha256(
    COALESCE(source, 'unknown')::bytea || ':'::bytea ||
    COALESCE(
      NULLIF(
        regexp_replace(source_url, '.*[/]([^/?#]+).*', '\1'),
        source_url
      ),
      id::text
    )::bytea
  ),
  'hex'
)
WHERE fingerprint IS NULL AND source_url IS NOT NULL;

-- Unique index (only after backfill)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_fingerprint ON leads(fingerprint) WHERE fingerprint IS NOT NULL;

-- 2. Source metrics column on scrape log
ALTER TABLE leads_scrape_log ADD COLUMN IF NOT EXISTS source_metrics JSONB;

-- 3. Alert webhook config table
CREATE TABLE IF NOT EXISTS source_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 007: Lead data integrity ───────────────────────────────────────────────

-- 1. Columns the scraper now writes
alter table public.leads add column if not exists source       text default 'direct';
alter table public.leads add column if not exists ir35         text;           -- 'inside' | 'outside' | null
alter table public.leads add column if not exists posted_date  timestamptz default now();

-- 2. DB-level dedup safety net (non-null URLs must be unique)
create unique index if not exists leads_source_url_key
  on public.leads (source_url)
  where source_url is not null;

-- 3. Feed-query indexes
create index if not exists leads_source_idx      on public.leads (source);
create index if not exists leads_posted_date_idx on public.leads (posted_date desc);

-- 4. Profile: IR35 stance from onboarding
alter table public.profiles add column if not exists ir35_preference text;
