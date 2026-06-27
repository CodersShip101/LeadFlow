import type { SourceConfig } from '../types'

export const hackernews: SourceConfig = {
  id: 'hackernews',
  name: 'Hacker News',
  schedule: 'fast',
  method: 'api',
  async fetch() {
    const res = await fetch('https://hn.algolia.com/api/v1/search?query=whoishiring+hiring+freelance+contract&tags=story&hitsPerPage=5', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const stories = data.hits || []
    const results: any[] = []

    for (const story of stories.slice(0, 3)) {
      const itemRes = await fetch(`https://hn.algolia.com/api/v1/items/${story.objectID}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (!itemRes.ok) continue
      const item = await itemRes.json()
      const comments = item.children || []
      for (const c of comments.slice(0, 10)) {
        if (!c.text || c.text.length < 50) continue
        results.push({
          externalId: `${story.objectID}_${c.id}`,
          rawText: (c.text || '').replace(/<[^>]*>/g, '').substring(0, 3000),
          sourceUrl: `https://news.ycombinator.com/item?id=${story.objectID}`,
          postedDate: new Date(c.created_at).toISOString(),
        })
      }
    }
    return results
  },
}
