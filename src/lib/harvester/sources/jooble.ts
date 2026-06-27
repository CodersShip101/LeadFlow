import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

// Jooble job aggregator. Free API key from jooble.org/api/about.
// Skips cleanly when JOOBLE_API_KEY is unset.
export const jooble: SourceConfig = {
  id: 'jooble',
  name: 'Jooble',
  schedule: 'slow',
  method: 'api',
  async fetch() {
    const key = process.env.JOOBLE_API_KEY
    if (!key) return []
    const res = await fetch(`https://jooble.org/api/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: 'freelance contract remote developer', location: '' }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 20).map((job: any) => ({
      externalId: String(job.id || job.link || ''),
      rawText: `Title: ${job.title || ''}\nCompany: ${job.company || ''}\nLocation: ${job.location || ''}\nType: ${job.type || ''}\nSalary: ${job.salary || ''}\n\n${(job.snippet || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      sourceUrl: job.link || '',
      postedDate: parseDate(job.updated),
    }))
  },
}
