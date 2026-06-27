import type { SourceConfig, RawPost } from '../types'
import { rssDate, decodeHtml } from '../utils'

// Generic RSS/Atom <item> reader. Most job boards expose a standard RSS feed
// with <title>/<link>/<description>/<guid>/<pubDate>; this turns any such feed
// into a SourceConfig with one line. decodeHtml() strips CDATA + tags + entities.
function rssSource(
  id: string,
  name: string,
  url: string,
  schedule: SourceConfig['schedule'] = 'medium',
  limit = 15,
): SourceConfig {
  return {
    id,
    name,
    schedule,
    method: 'rss',
    async fetch(): Promise<RawPost[]> {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Flaiir/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return []
      const text = await res.text()
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
      return items.slice(0, limit).map((item): RawPost => {
        const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim()
        return {
          externalId: (item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || link).trim(),
          rawText: `Title: ${decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')}\n\n${decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').substring(0, 3000)}`,
          sourceUrl: link,
          postedDate: rssDate(item),
        }
      })
    },
  }
}

export const jobspresso    = rssSource('jobspresso', 'Jobspresso', 'https://jobspresso.co/?feed=job_feed')
export const skipthedrive  = rssSource('skipthedrive', 'SkipTheDrive', 'https://www.skipthedrive.com/feed/')
export const pythonjobs    = rssSource('pythonjobs', 'Python.org Jobs', 'https://www.python.org/jobs/feed/rss/', 'slow')
export const larajobs      = rssSource('larajobs', 'LaraJobs', 'https://larajobs.com/feed', 'slow')
export const authenticjobs = rssSource('authenticjobs', 'Authentic Jobs', 'https://authenticjobs.com/?feed=job_feed', 'slow')
export const nodesk        = rssSource('nodesk', 'NoDesk', 'https://nodesk.co/remote-jobs/index.xml')
export const workew        = rssSource('workew', 'Workew', 'https://workew.com/feed/?post_type=job_listing', 'slow')
