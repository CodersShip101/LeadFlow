import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { full_name, disciplines, skills, hourly_rate, experience_level, availability, timezone, ir35_preference } = body
    const ir35 = ir35_preference === 'inside' || ir35_preference === 'outside' ? ir35_preference : null

    const admin = createAdminSupabase()
    const { error } = await admin.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: full_name || null,
      disciplines: disciplines || null,
      skills: skills || null,
      hourly_rate: hourly_rate || null,
      experience_level: experience_level || null,
      availability: availability || null,
      timezone: timezone || null,
      ir35_preference: ir35,
      onboarding_completed: true,
      subscription_status: 'free',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
