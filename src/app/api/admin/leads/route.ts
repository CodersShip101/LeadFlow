import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Admin gate: only the configured admin email may hit these endpoints
    // (the /admin page enforces the same check client-side — this makes it real).
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createAdminSupabase()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('posted_date', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Admin leads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Admin gate: only the configured admin email may hit these endpoints
    // (the /admin page enforces the same check client-side — this makes it real).
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
      return NextResponse.json({ error: 'Invalid description format' }, { status: 400 })
    }

    const supabase = await createAdminSupabase()
    const { data, error } = await supabase
      .from('leads')
      .insert({
        title: body.title,
        description: body.description,
        budget_min: body.budget_min || null,
        budget_max: body.budget_max || null,
        project_type: body.project_type || null,
        skills_required: body.skills_required || [],
        client_location: body.client_location || null,
        source_url: body.source_url || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin lead insert error:', error)
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Admin gate: only the configured admin email may hit these endpoints
    // (the /admin page enforces the same check client-side — this makes it real).
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await req.json()
    if (typeof id !== 'string' || !id || id.length > 200) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    const supabase = await createAdminSupabase()
    const { error } = await supabase.from('leads').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin lead delete error:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
