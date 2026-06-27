import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

export const jobicy: SourceConfig = {
  id: 'jobicy',
  name: 'Jobicy',
  schedule: 'fast',
  method: 'api',
  async fetch() {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 20).map((job: any) => ({
      externalId: String(job.id || ''),
      rawText: `Title: ${job.jobTitle || ''}\nCompany: ${job.companyName || ''}\nType: ${job.jobType || ''}\nLevel: ${job.jobLevel || ''}\nLocation: ${job.jobGeo || ''}\n\n${(job.jobExcerpt || job.jobDescription || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.url || '',
      postedDate: parseDate(job.pubDate),
    }))
  },
}
