import type { SourceConfig, RawPost, HarvestResult, ScheduleName } from './types'
import { reddit, redditJobbit, redditRemotejs, redditFreelance } from './sources/reddit'
import { hackernews } from './sources/hackernews'
import { reed } from './sources/reed'
import { wwr } from './sources/wwr'
import { remoteok } from './sources/remoteok'
import { remotive } from './sources/remotive'
import { cwjobs } from './sources/cwjobs'
import { indeed } from './sources/indeed'
import { himalayas } from './sources/himalayas'
import { arbeitnow } from './sources/arbeitnow'
import { jsearch } from './sources/jsearch'
import { jobicy } from './sources/jobicy'
import { workingnomads } from './sources/workingnomads'
import { jobspresso, skipthedrive, pythonjobs, larajobs, authenticjobs, nodesk, workew } from './sources/rss'
import { adzuna } from './sources/adzuna'
import { jooble } from './sources/jooble'
import { findwork } from './sources/findwork'

const ALL_SOURCES: SourceConfig[] = [
  reddit, redditJobbit, redditRemotejs, redditFreelance,
  hackernews, reed, wwr, remoteok, remotive,
  cwjobs, indeed, himalayas, arbeitnow, jsearch,
  jobicy, workingnomads,
  // RSS feeds
  jobspresso, skipthedrive, pythonjobs, larajobs, authenticjobs, nodesk, workew,
  // Aggregators (require a free API key; skip cleanly when unset)
  adzuna, jooble, findwork,
]

export function sourcesForSchedule(schedule: ScheduleName): SourceConfig[] {
  return ALL_SOURCES.filter(s => s.schedule === schedule)
}

export async function harvestAll(sources: SourceConfig[]): Promise<{ posts: RawPost[]; results: HarvestResult[] }> {
  const posts: RawPost[] = []
  const results: HarvestResult[] = []

  const batches = await Promise.allSettled(sources.map(async (source) => {
    try {
      const fetched = await source.fetch()
      // Tag each post with its source so fingerprinting + attribution stay correct
      // once everything is flattened into one array.
      posts.push(...fetched.map(p => ({ ...p, source: source.id })))
      return { source: source.id, found: fetched.length, errors: [] }
    } catch (e) {
      return { source: source.id, found: 0, errors: [e instanceof Error ? e.message.substring(0, 100) : 'Unknown'] }
    }
  }))

  for (const batch of batches) {
    if (batch.status === 'fulfilled') results.push(batch.value)
    else results.push({ source: 'unknown', found: 0, errors: ['Promise rejected'] })
  }

  return { posts, results }
}
