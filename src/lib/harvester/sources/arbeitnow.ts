import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const arbeitnow: SourceConfig = {
  id: 'arbeitnow',
  name: 'Arbeitnow',
  schedule: 'medium',
  method: 'api',
  async fetch() {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).slice(0, 20).map((job: any) => ({
      externalId: job.slug || String(job.id || ''),
      rawText: `Title: ${job.title || ''}\nCompany: ${job.company_name || ''}\nTags: ${(job.tags || []).join(', ')}\nRemote: ${job.remote ? 'Yes' : 'No'}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || '',
      postedDate: parseDate(job.created_at),
    }))
  },
}
