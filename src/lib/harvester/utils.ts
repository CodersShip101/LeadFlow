export function parseDate(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return new Date(raw < 1e12 ? raw * 1000 : raw).toISOString()
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function rssDate(item: string): string | null {
  return parseDate(item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || null)
}

export function decodeHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
