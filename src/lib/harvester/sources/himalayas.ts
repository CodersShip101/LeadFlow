import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const himalayas: SourceConfig = {
  id: 'himalayas',
  name: 'Himalayas',
  schedule: 'medium',
  method: 'api',
  async fetch() {
    const res = await fetch('https://himalayas.app/jobs/api', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 20).map((job: any) => ({
      externalId: job.guid || job.id || '',
      rawText: `Title: ${job.title || ''}\nCompany: ${job.companyName || ''}\nCategories: ${(job.categories || []).join(', ')}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.applicationLink || job.guid || '',
      postedDate: parseDate(job.pubDate),
    }))
  },
}
