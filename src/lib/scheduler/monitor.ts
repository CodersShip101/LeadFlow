import type { HarvestResult } from '../harvester/types'

export interface SourceHealth {
  id: string
  consecutiveZeros: number
}

const healthMap = new Map<string, SourceHealth>()

export function recordRun(results: HarvestResult[]): void {
  for (const r of results) {
    const prev = healthMap.get(r.source) || { id: r.source, consecutiveZeros: 0 }
    if (r.found === 0 && r.errors.length > 0) {
      prev.consecutiveZeros++
    } else {
      prev.consecutiveZeros = 0
    }
    healthMap.set(r.source, prev)
  }
}

export function getFailingSources(): HarvestResult[] {
  const failing: HarvestResult[] = []
  for (const [id, health] of healthMap) {
    if (health.consecutiveZeros >= 3) {
      failing.push({ source: id, found: 0, errors: [`${health.consecutiveZeros} consecutive empty runs`] })
    }
  }
  return failing
}

export async function fireAlert(source: string, webhookUrl?: string): Promise<void> {
  const url = webhookUrl || process.env.DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `Source failure: ${source}`,
          description: `Source returned 0 items for 3 consecutive runs.`,
          color: 16734296,
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  } catch { /* non-blocking */ }
}
