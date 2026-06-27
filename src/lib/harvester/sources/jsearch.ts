import type { SourceConfig } from '../types'
import { parseDate } from '../utils'

const QUERIES = [
  'freelance developer remote',
  'freelance designer remote',
  'freelance writer remote',
  'remote contract developer',
  'freelance marketing remote',
  'contract designer remote',
]

export const jsearch: SourceConfig = {
  id: 'jsearch',
  name: 'JSearch',
  schedule: 'slow',
  method: 'api',
  async fetch() {
    const key = process.env.RAPIDAPI_KEY
    if (!key) return []
    const perQuery = await Promise.all(QUERIES.map(async (query) => {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=week`
      try {
        const res = await fetch(url, {
          headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return []
        const data = await res.json()
        return (data.data || []).map((job: any) => {
          const loc = [job.job_city, job.job_country].filter(Boolean).join(', ')
          return {
            externalId: job.job_id || job.job_google_link || '',
            rawText: `Title: ${job.job_title || ''}\nCompany: ${job.employer_name || ''}\nLocation: ${job.job_is_remote ? 'Remote' : loc || ''}\nEmployment: ${job.job_employment_type || ''}\n\n${(job.job_description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
            sourceUrl: job.job_apply_link || job.job_google_link || '',
            postedDate: parseDate(job.job_posted_at_datetime_utc || job.job_posted_at_timestamp),
          }
        })
      } catch { return [] }
    }))
    return perQuery.flat()
  },
}
