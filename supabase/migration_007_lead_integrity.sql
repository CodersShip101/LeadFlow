-- ============================================================================
-- Flaiir — Migration 007: Lead data integrity
-- Ensures the scraper can persist source attribution, real posting times and
-- IR35 status, and prevents duplicate leads at the database level.
-- Run AFTER migration_006_harvester.sql, in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- 1. COLUMNS the scraper now writes (no-ops if they already exist)
alter table public.leads add column if not exists source       text default 'direct';
alter table public.leads add column if not exists ir35         text;           -- 'inside' | 'outside' | null
alter table public.leads add column if not exists posted_date  timestamptz default now();

-- 2. DEDUP at the database level. The scrape route filters known URLs in-app,
--    but a unique index makes duplicates impossible even under concurrent runs
--    and lets us switch to upsert/onConflict. NULL source_urls are allowed
--    (manual/seeded leads); only non-null URLs must be unique.
--    NOTE: migration_006_harvester.sql adds a `fingerprint` column for
--    cross-source dedup; this URL index is the per-source safety net.
create unique index if not exists leads_source_url_key
  on public.leads (source_url)
  where source_url is not null;

-- 3. Helpful indexes for the feed query (filter by source, order by recency).
create index if not exists leads_source_idx      on public.leads (source);
create index if not exists leads_posted_date_idx on public.leads (posted_date desc);

-- 4. PROFILE: IR35 stance captured at onboarding, fed into the IR35 scoring
--    modifier ('inside' | 'outside' | null = no preference).
alter table public.profiles add column if not exists ir35_preference text;
