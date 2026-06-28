import type { CSSProperties } from 'react'

// Display metadata per source id (the value the scraper writes to leads.source).
// Reddit's sub-feeds all canonicalise to 'reddit'. Unknown ids fall back to a
// title-cased label + neutral colour, so new sources never break the UI.
// Shared by the feed and the saved page so the two never drift.
export const SOURCE_META: Record<string, { label: string; color: string }> = {
  reddit:        { label: 'Reddit',         color: '#C73A1F' },
  hackernews:    { label: 'Hacker News',    color: '#FF6600' },
  reed:          { label: 'Reed',           color: '#2A5FB8' },
  wwr:           { label: 'WWR',            color: '#9A6A0C' },
  remoteok:      { label: 'Remote OK',      color: '#7344C0' },
  remotive:      { label: 'Remotive',       color: '#159F94' },
  cwjobs:        { label: 'CWJobs',         color: '#0E7C5A' },
  indeed:        { label: 'Indeed',         color: '#2557A7' },
  himalayas:     { label: 'Himalayas',      color: '#5B6CFF' },
  arbeitnow:     { label: 'Arbeitnow',      color: '#C0392B' },
  jsearch:       { label: 'JSearch',        color: '#8E44AD' },
  jobicy:        { label: 'Jobicy',         color: '#D63384' },
  workingnomads: { label: 'Working Nomads', color: '#138A72' },
  jobspresso:    { label: 'Jobspresso',     color: '#6F4E37' },
  skipthedrive:  { label: 'SkipTheDrive',   color: '#2C82C9' },
  pythonjobs:    { label: 'Python Jobs',    color: '#3776AB' },
  larajobs:      { label: 'LaraJobs',       color: '#E04030' },
  authenticjobs: { label: 'Authentic Jobs', color: '#34495E' },
  nodesk:        { label: 'NoDesk',         color: '#1F2937' },
  workew:        { label: 'Workew',         color: '#00A38C' },
  adzuna:        { label: 'Adzuna',         color: '#7E57C2' },
  jooble:        { label: 'Jooble',         color: '#2D9CDB' },
  findwork:      { label: 'Findwork',       color: '#0B6E4F' },
}

export function srcKey(surl: string | null): string {
  const l = (surl || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'remoteok'
}

// Canonical source id for a lead: prefer the scraper-set `source`, group Reddit
// sub-feeds, and fall back to guessing from the URL for legacy rows.
export function canonSource(lead: { source?: string | null; source_url?: string | null }): string {
  const s = (lead.source || '').toLowerCase()
  if (s.startsWith('reddit')) return 'reddit'
  if (s && s !== 'direct' && s !== 'unknown') return s
  return srcKey(lead.source_url ?? null)
}

export function sourceMeta(id: string): { label: string; color: string } {
  return SOURCE_META[id] || { label: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Other', color: '#6B7A8F' }
}

// Light tinted background for a source badge from its brand colour.
export function srcBadgeStyle(color: string): CSSProperties {
  return { background: `color-mix(in srgb, ${color} 13%, white)`, color }
}
