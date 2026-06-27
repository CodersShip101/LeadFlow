import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const workingnomads: SourceConfig = {
  id: 'workingnomads',
  name: 'Working Nomads',
  schedule: 'medium',
  method: 'api',
  async fetch() {
    const res = await fetch('https://www.workingnomads.com/api/exposed_jobs/', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : []).slice(0, 20).map((job: any) => ({
      externalId: job.url || '',
      rawText: `Title: ${job.title || ''}\nCompany: ${job.company_name || ''}\nCategory: ${job.category_name || ''}\nTags: ${Array.isArray(job.tags) ? job.tags.join(', ') : (job.tags || '')}\nLocation: ${job.location || ''}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || '',
      postedDate: parseDate(job.pub_date),
    }))
  },
}
