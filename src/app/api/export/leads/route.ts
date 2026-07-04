import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'
import { scoreLead, type ScoringLead } from '@/lib/scoring'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, skills, hourly_rate')
      .eq('id', user.id)
      .single()

    const plan = (profile?.subscription_status ?? 'free') as Tier
    if (!ENTITLEMENTS[plan].csvExport) {
      return NextResponse.json({ error: 'CSV export requires Pro plan', upgrade: true }, { status: 403 })
    }

    const admin = createAdminSupabase()

    const { data: apps } = await admin
      .from('applications')
      .select('lead_id, status, outcome, created_at')
      .eq('freelancer_id', user.id)

    const leadIds = (apps ?? []).map(a => a.lead_id)
    let leads: any[] = []
    if (leadIds.length > 0) {
      const { data } = await admin
        .from('leads')
        .select('*')
        .in('id', leadIds)
      leads = data ?? []
    }

    const appMap = new Map((apps ?? []).map(a => [a.lead_id, a]))

    const headers = [
      'Title', 'Source', 'Score', 'Budget Min', 'Budget Max',
      'Location', 'Type', 'Skills Required', 'Posted Date',
      'Your Status', 'Outcome', 'Applied At', 'Source URL',
    ]

    const rows = leads.map(l => {
      const app = appMap.get(l.id)
      const scored = scoreLead(l as ScoringLead, {
        skills: profile?.skills ?? [],
        hourly_rate: profile?.hourly_rate ?? null,
      })
      return [
        `"${(l.title ?? '').replace(/"/g, '""')}"`,
        l.source ?? '',
        scored.score,
        l.budget_min ?? '',
        l.budget_max ?? '',
        `"${(l.client_location ?? '').replace(/"/g, '""')}"`,
        l.project_type ?? '',
        `"${(l.skills_required ?? []).join(', ')}"`,
        l.posted_date ? new Date(l.posted_date).toISOString().split('T')[0] : '',
        app?.status ?? '',
        app?.outcome ?? '',
        app?.created_at ? new Date(app.created_at).toISOString().split('T')[0] : '',
        l.source_url ?? '',
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leadflow-export-${date}.csv"`,
      },
    })
  } catch (e) {
    console.error('Export leads error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
