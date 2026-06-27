import type { SourceConfig } from '../types'
import { rssDate, decodeHtml } from '../utils'

export const reed: SourceConfig = {
  id: 'reed',
  name: 'Reed',
  schedule: 'slow',
  method: 'rss',
  async fetch() {
    const res = await fetch('https://www.reed.co.uk/jobs/rss/freelance?keywords=developer+designer+writer+marketing', {
      headers: { 'User-Agent': 'Flaiir/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => {
      const title = decodeHtml(item.match(/<title>(.*?)<\/title>/)?.[1] || '')
      const desc = decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').substring(0, 3000)
      const company = decodeHtml(item.match(/<company>(.*?)<\/company>/)?.[1] || '')
      const location = decodeHtml(item.match(/<location>(.*?)<\/location>/)?.[1] || '')
      return {
        externalId: item.match(/<guid>(.*?)<\/guid>/)?.[1] || item.match(/<link>(.*?)<\/link>/)?.[1] || '',
        rawText: `Title: ${title}\nCompany: ${company}\nLocation: ${location}\n\n${desc}`,
        sourceUrl: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
        postedDate: rssDate(item),
      }
    })
  },
}
