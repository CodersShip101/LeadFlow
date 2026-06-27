export interface SourceConfig {
  id: string
  name: string
  schedule: 'fast' | 'medium' | 'slow'
  method: 'api' | 'rss'
  fetch(): Promise<RawPost[]>
}

export interface RawPost {
  externalId: string
  rawText: string
  sourceUrl: string
  postedDate: string | null
  /** Set centrally by harvestAll() so downstream code knows which source produced it. */
  source?: string
}

export interface HarvestResult {
  source: string
  found: number
  errors: string[]
}

export type ScheduleName = 'fast' | 'medium' | 'slow'
