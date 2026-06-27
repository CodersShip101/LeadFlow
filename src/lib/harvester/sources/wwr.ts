import type { SourceConfig } from '../types'
import { rssDate, decodeHtml } from '../utils'

export const wwr: SourceConfig = {
  id: 'wwr',
  name: 'We Work Remotely',
  schedule: 'medium',
  method: 'rss',
  async fetch() {
    const res = await fetch('https://weworkremotely.com/remote-jobs.rss', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => ({
      externalId: item.match(/<guid>(.*?)<\/guid>/)?.[1] || item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      rawText: `Title: ${decodeHtml(item.match(/<title>(.*?)<\/title>/)?.[1] || '')}\n\n${decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').substring(0, 3000)}`,
      sourceUrl: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      postedDate: rssDate(item),
    }))
  },
}
