import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

const DEFAULT_WEIGHTS = { skill: 0.45, rate: 0.30, recency: 0.15, detail: 0.10 }

function validateWeights(w: unknown): w is typeof DEFAULT_WEIGHTS {
  if (!w || typeof w !== 'object') return false
  const obj = w as Record<string, unknown>
  const keys = ['skill', 'rate', 'recency', 'detail']
  if (!keys.every(k => typeof obj[k] === 'number')) return false
  const sum = keys.reduce((s, k) => s + (obj[k] as number), 0)
  return Math.abs(sum - 1) < 0.01 // must sum to 1 (±1%)
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, scoring_weights')
    .eq('id', user.id)
    .single()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const canAdjust = ENTITLEMENTS[plan].adjustableScoring

  return NextResponse.json({
    weights: profile?.scoring_weights ?? DEFAULT_WEIGHTS,
    defaults: DEFAULT_WEIGHTS,
    canAdjust,
    plan,
  })
}

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
  if (!ENTITLEMENTS[plan].adjustableScoring) {
    return NextResponse.json({ error: 'Adjustable scoring requires Pro plan', upgrade: true }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!validateWeights(body?.weights)) {
    return NextResponse.json({
      error: 'Invalid weights — must include skill, rate, recency, detail and sum to 1.0',
    }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('profiles')
    .update({ scoring_weights: body.weights })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ weights: body.weights, saved: true })
}

export async function DELETE() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  await admin.from('profiles').update({ scoring_weights: null }).eq('id', user.id)
  return NextResponse.json({ weights: DEFAULT_WEIGHTS, reset: true })
}
