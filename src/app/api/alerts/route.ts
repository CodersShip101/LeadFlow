import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

// GET — fetch user's alert preferences
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, alert_preferences')
    .eq('id', user.id)
    .single()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const canUseAlerts = ENTITLEMENTS[plan].customAlerts

  return NextResponse.json({
    canUseAlerts,
    plan,
    preferences: profile?.alert_preferences ?? {
      enabled: false,
      minScore: 8,
      sources: [], // empty = all sources
      keywords: [],
    },
  })
}

// PUT — update alert preferences
export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  if (!ENTITLEMENTS[plan].customAlerts) {
    return NextResponse.json({ error: 'Custom alerts require Starter plan', upgrade: true }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const prefs = {
    enabled: Boolean(body.enabled),
    minScore: Math.min(10, Math.max(1, Number(body.minScore) || 7)),
    sources: Array.isArray(body.sources) ? body.sources.filter((s: unknown) => typeof s === 'string' && (s as string).length <= 200) : [],
    keywords: Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === 'string' && (k as string).length <= 200).slice(0, 10) : [],
  }

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('profiles')
    .update({ alert_preferences: prefs })
    .eq('id', user.id)

  if (error) {
    console.error('PUT /api/alerts error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
  return NextResponse.json({ preferences: prefs, saved: true })
}
