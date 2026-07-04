import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

function normalizePlan(raw: string): Tier {
  if (raw === 'starter') return 'pro'
  if (raw === 'pro') return 'max'
  if (raw === 'max' || raw === 'team' || raw === 'enterprise') return raw as Tier
  return 'free'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leadId } = await req.json().catch(() => ({}))
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    if (typeof leadId !== 'string' || leadId.length > 200)
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 })

    const { data: planRow } = await supabase.rpc('effective_plan', { p_user: user.id })
    const plan = normalizePlan((planRow as string) ?? 'free')

    const { data: profile } = await supabase
      .from('profiles')
      .select('applications_this_month')
      .eq('id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const cap = ENTITLEMENTS[plan].applicationsPerMonth
    if (cap !== 'unlimited' && profile.applications_this_month >= cap) {
      return NextResponse.json(
        { error: 'quota_reached', message: `Your plan is limited to ${cap} applications per month.`, cap, plan },
        { status: 402 },
      )
    }

    const { error: upErr } = await supabase.from('applications').upsert(
      {
        freelancer_id: user.id,
        lead_id: leadId,
        status: 'applied',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'freelancer_id,lead_id' },
    )
    if (upErr) {
      console.error(upErr)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const { error: incErr } = await supabase.rpc('increment_application_counters', { p_user: user.id })
    if (incErr) {
      await supabase
        .from('profiles')
        .update({ applications_this_month: (profile.applications_this_month ?? 0) + 1 })
        .eq('id', user.id)
    }

    return NextResponse.json({ ok: true, status: 'applied' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
