import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// GDPR right to data portability: download everything we hold on the user as
// a single JSON file. Admin client so it reads across all their rows regardless
// of RLS, but scoped strictly to the authenticated user's own ids.
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminSupabase()
    const [profile, applications, saved, templates, searchLog, memberships, ownedOrgs] =
      await Promise.all([
        admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        admin.from('applications').select('*').eq('freelancer_id', user.id),
        admin.from('saved_leads').select('*').eq('user_id', user.id),
        admin.from('templates').select('*').eq('owner_id', user.id),
        admin.from('search_log').select('*').eq('user_id', user.id),
        admin.from('org_members').select('*').eq('user_id', user.id),
        admin.from('organizations').select('*').eq('owner_id', user.id),
      ])

    const payload = {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      applications: applications.data ?? [],
      saved_leads: saved.data ?? [],
      templates: templates.data ?? [],
      search_history: searchLog.data ?? [],
      team_memberships: memberships.data ?? [],
      owned_teams: ownedOrgs.data ?? [],
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="flaiir-data-export-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Data export failed:', err)
    return NextResponse.json({ error: 'Could not generate export' }, { status: 500 })
  }
}
