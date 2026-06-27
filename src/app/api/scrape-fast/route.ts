import { NextResponse } from 'next/server'
import { runSchedule } from '@/lib/scheduler'
import { isAuthorizedCron } from '@/lib/cron'

export const maxDuration = 60

async function run() {
  const result = await runSchedule('fast')
  return NextResponse.json(result)
}

// Vercel Cron hits this with GET — that's what drives the automatic scrape.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return await run() }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 }) }
}

// Manual trigger (admin).
export async function POST() {
  try { return await run() }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 }) }
}
