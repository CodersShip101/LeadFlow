import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

// Adzuna aggregates jobs from across the web. Free tier: register at
// developer.adzuna.com for an app id + key. Skips cleanly when unconfigured.
export const adzuna: SourceConfig = {
  id: 'adzuna',
  name: 'Adzuna',
  schedule: 'slow',
  method: 'api',
  async fetch() {
    const appId = process.env.ADZUNA_APP_ID
    const appKey = process.env.ADZUNA_APP_KEY
    if (!appId || !appKey) return []
    const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&content-type=application/json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, 25).map((job: any) => ({
      externalId: String(job.id || ''),
      rawText: `Title: ${job.title || ''}\nCompany: ${job.company?.display_name || ''}\nLocation: ${job.location?.display_name || ''}\nSalary: ${job.salary_min || ''}-${job.salary_max || ''}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.redirect_url || '',
      postedDate: parseDate(job.created),
    }))
  },
}
