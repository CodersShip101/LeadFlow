import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const remotive: SourceConfig = {
  id: 'remotive',
  name: 'Remotive',
  schedule: 'medium',
  method: 'api',
  async fetch() {
    const res = await fetch('https://remotive.com/api/remote-jobs', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 15).map((job: any) => ({
      externalId: job.id || '',
      rawText: `Title: ${job.title}\nCompany: ${job.company_name || ''}\nCategory: ${job.category || ''}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || '',
      postedDate: parseDate(job.publication_date),
    }))
  },
}
