import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

// Findwork.dev developer-focused board. Free API token from findwork.dev/api.
// Skips cleanly when FINDWORK_API_KEY is unset.
export const findwork: SourceConfig = {
  id: 'findwork',
  name: 'Findwork',
  schedule: 'slow',
  method: 'api',
  async fetch() {
    const key = process.env.FINDWORK_API_KEY
    if (!key) return []
    const res = await fetch('https://findwork.dev/api/jobs/?remote=true&sort_by=date', {
      headers: { Authorization: `Token ${key}`, 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, 20).map((job: any) => ({
      externalId: String(job.id || ''),
      rawText: `Title: ${job.role || ''}\nCompany: ${job.company_name || ''}\nLocation: ${job.location || ''}\nKeywords: ${(job.keywords || []).join(', ')}\n\n${(job.text || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || '',
      postedDate: parseDate(job.date_posted),
    }))
  },
}
