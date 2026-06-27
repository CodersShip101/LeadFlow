import type { RawPost } from '../harvester/types'
import { generateFingerprint } from './fingerprint'
import { normalizePay } from './normalize'

export interface ProcessedPost {
  fingerprint: string
  rawText: string
  sourceUrl: string
  postedDate: string | null
  source: string
}

export function runProcessor(posts: RawPost[], fallbackSourceId = 'unknown'): ProcessedPost[] {
  return posts.map(p => {
    const source = p.source ?? fallbackSourceId
    return {
      fingerprint: generateFingerprint(source, p.externalId),
      rawText: p.rawText,
      sourceUrl: p.sourceUrl,
      postedDate: p.postedDate,
      source,
    }
  })
}
