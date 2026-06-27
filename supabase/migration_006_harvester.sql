-- Harvester v2: fingerprint dedup + per-source monitoring

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
