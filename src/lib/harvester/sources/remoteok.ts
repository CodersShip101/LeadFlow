import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const remoteok: SourceConfig = {
  id: 'remoteok',
  name: 'Remote OK',
  schedule: 'fast',
  method: 'api',
  async fetch() {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data.slice(1) : []).slice(0, 20).map((job: any) => ({
      externalId: job.id || job.slug || '',
      rawText: `Title: ${job.position || job.title || ''}\nCompany: ${job.company || ''}\nTags: ${(job.tags || []).join(', ')}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || (job.id ? `https://remoteok.com/remote-jobs/${job.id}` : ''),
      postedDate: parseDate(job.date || job.epoch),
    }))
  },
}
