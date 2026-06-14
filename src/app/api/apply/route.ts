import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const FREE_MONTHLY_CAP = 5

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await req.json().catch(() => ({}))
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, applications_this_month')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  if (profile.plan === 'free' && profile.applications_this_month >= FREE_MONTHLY_CAP) {
    return NextResponse.json(
      {
        error: 'quota_reached',
        message: `Free plan is limited to ${FREE_MONTHLY_CAP} applications per month.`,
        cap: FREE_MONTHLY_CAP,
      },
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
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { error: incErr } = await supabase.rpc('increment_application_counters', {
    p_user: user.id,
  })
  if (incErr) {
    await supabase
      .from('profiles')
      .update({
        applications_this_month: (profile.applications_this_month ?? 0) + 1,
      })
      .eq('id', user.id)
  }

  return NextResponse.json({ ok: true, stage: 'applied' })
}
