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
    if (full_name != null && (typeof full_name !== 'string' || full_name.length > 500))
      return NextResponse.json({ error: 'Invalid full_name' }, { status: 400 })
    if (disciplines != null) {
      if (typeof disciplines === 'string') {
        if (disciplines.length > 500)
          return NextResponse.json({ error: 'Invalid disciplines' }, { status: 400 })
      } else if (!Array.isArray(disciplines) || !disciplines.every((d: unknown) => typeof d === 'string' && (d as string).length <= 500)) {
        return NextResponse.json({ error: 'Invalid disciplines' }, { status: 400 })
      }
    }
    if (skills != null) {
      if (typeof skills === 'string') {
        if (skills.length > 500)
          return NextResponse.json({ error: 'Invalid skills' }, { status: 400 })
      } else if (!Array.isArray(skills) || !skills.every((s: unknown) => typeof s === 'string' && (s as string).length <= 500)) {
        return NextResponse.json({ error: 'Invalid skills' }, { status: 400 })
      }
    }
    if (hourly_rate != null && typeof hourly_rate !== 'number')
      return NextResponse.json({ error: 'Invalid hourly_rate' }, { status: 400 })
    if (experience_level != null && (typeof experience_level !== 'string' || experience_level.length > 200))
      return NextResponse.json({ error: 'Invalid experience_level' }, { status: 400 })
    if (availability != null && (typeof availability !== 'string' || availability.length > 200))
      return NextResponse.json({ error: 'Invalid availability' }, { status: 400 })
    if (timezone != null && (typeof timezone !== 'string' || timezone.length > 200))
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    if (ir35_preference != null && (typeof ir35_preference !== 'string' || ir35_preference.length > 200))
      return NextResponse.json({ error: 'Invalid ir35_preference' }, { status: 400 })
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

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
