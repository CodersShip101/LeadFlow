import type { SourceConfig } from '../types'

// App-only OAuth. Reddit increasingly blocks/rate-limits the public *.json
// endpoints from server IPs (you get an HTML challenge page instead of JSON),
// so we authenticate with the app credentials when they're set and fall back to
// the public endpoint otherwise. The token is cached across sources in a run.
let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) return null
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Flaiir/1.0',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token) return null
    cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
    return cachedToken.token
  } catch {
    return null
  }
}

function redditSub(id: string, sub: string, schedule: SourceConfig['schedule'] = 'fast'): SourceConfig {
  return {
    id,
    name: `Reddit r/${sub}`,
    schedule,
    method: 'api',
    async fetch() {
      const token = await getToken()
      const base = token ? 'https://oauth.reddit.com' : 'https://www.reddit.com'
      const path = token ? `/r/${sub}/new?limit=15` : `/r/${sub}/new.json?limit=15`
      const res = await fetch(`${base}${path}`, {
        headers: {
          'User-Agent': 'Flaiir/1.0',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.data?.children || [])
        .filter(({ data: p }: any) => !p.stickied && p.post_hint !== 'link')
        .map(({ data: p }: any) => ({
          externalId: p.id,
          rawText: `Title: ${p.title}\n\n${(p.selftext || '').substring(0, 3000)}`,
          sourceUrl: `https://reddit.com${p.permalink}`,
          postedDate: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
        }))
    },
  }
}

export const reddit = redditSub('reddit', 'forhire')
export const redditJobbit = redditSub('reddit-jobbit', 'jobbit', 'medium')
export const redditRemotejs = redditSub('reddit-remotejs', 'remotejs', 'fast')
export const redditFreelance = redditSub('reddit-freelance', 'freelance_forhire', 'medium')
