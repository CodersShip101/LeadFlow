import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { PRICING } from '@/lib/tiers'

// Seat cost over the last 6 months, reconstructed from seat_events. Admin only.
// Returns [] gracefully if the table isn't there / no history yet.
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org || org.role !== 'admin') return NextResponse.json({ months: [] })

  const admin = createAdminSupabase()
  const { data: events, error } = await admin
    .from('seat_events')
    .select('to_seats, from_seats, created_at')
    .eq('org_id', org.org_id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ months: [] })

  const evs = events ?? []
  const currentSeats = org.seats as number
  const perSeat = PRICING.team.monthly ?? 39

  // Seat count in effect at a given instant: the to_seats of the last change
  // before it; before any change, the from_seats of the first; else current.
  const seatsAt = (t: number): number => {
    let seats = evs.length ? (evs[0].from_seats as number) : currentSeats
    for (const e of evs) {
      if (new Date(e.created_at as string).getTime() <= t) seats = e.to_seats as number
      else break
    }
    return seats
  }

  const now = new Date()
  const months: { label: string; seats: number; cost: number }[] = []
  for (let i = 5; i >= 0; i--) {
    // Sample at each month's end (or now for the current month).
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59))
    const sampleT = Math.min(d.getTime(), now.getTime())
    const seats = seatsAt(sampleT)
    months.push({
      label: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toLocaleDateString('en-GB', { month: 'short' }),
      seats,
      cost: seats * perSeat,
    })
  }
  const changed = new Set(months.map(m => m.seats)).size > 1
  return NextResponse.json({ months, perSeat, changed })
}
