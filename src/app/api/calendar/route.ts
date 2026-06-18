import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'

// Private iCal feed. Calendar apps fetch this unauthenticated, so the secret
// `token` (per-user) is the auth. URL: /api/calendar?token=...
function ics(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('missing token', { status: 400 })

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, subscription_status')
    .eq('calendar_token', token)
    .single()

  if (!profile) return new NextResponse('invalid token', { status: 404 })
  if (!entitlementsFor((profile.subscription_status ?? 'free') as Tier).calendarSync) {
    return new NextResponse('calendar sync requires Pro', { status: 403 })
  }

  const { data: apps } = await admin
    .from('applications')
    .select('id, follow_up_at, follow_up_note, lead:leads(title)')
    .eq('freelancer_id', profile.id)
    .not('follow_up_at', 'is', null)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flaiir//Follow-ups//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Flaiir follow-ups',
  ]
  for (const a of (apps ?? [])) {
    const when = new Date(a.follow_up_at as string)
    const title = (a.lead as { title?: string } | null)?.title ?? 'Lead'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@flaiir`,
      `DTSTAMP:${ics(new Date())}`,
      `DTSTART:${ics(when)}`,
      `DURATION:PT30M`,
      `SUMMARY:${esc('Follow up: ' + title)}`,
      ...(a.follow_up_note ? [`DESCRIPTION:${esc(a.follow_up_note as string)}`] : []),
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Follow up: ' + title)}`, 'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="flaiir.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
