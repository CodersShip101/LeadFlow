import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'

async function ctx() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('profiles').select('subscription_status').eq('id', user.id).single()
  const plan = (profile?.subscription_status ?? 'free') as Tier
  if (!entitlementsFor(plan).pitchTemplates) {
    return { error: NextResponse.json({ error: 'Templates require the Pro plan', upgrade: true }, { status: 403 }) }
  }
  return { supabase, user, plan }
}

export async function GET() {
  const c = await ctx()
  if (c.error) return c.error
  const { data, error } = await c.supabase
    .from('templates')
    .select('id, title, body, org_id, owner_id, updated_at')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [], myId: c.user.id })
}

export async function POST(req: NextRequest) {
  const c = await ctx()
  if (c.error) return c.error
  const { title, body, shared } = await req.json().catch(() => ({}))
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  let orgId: string | null = null
  if (shared) {
    const { data: orgRows } = await c.supabase.rpc('user_org', { p_user: c.user.id })
    orgId = orgRows?.[0]?.org_id ?? null
  }

  const { data, error } = await c.supabase
    .from('templates')
    .insert({ owner_id: c.user.id, org_id: orgId, title: title.trim(), body: body ?? '' })
    .select('id, title, body, org_id, owner_id, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function PUT(req: NextRequest) {
  const c = await ctx()
  if (c.error) return c.error
  const { id, title, body } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await c.supabase
    .from('templates')
    .update({ title: title?.trim(), body: body ?? '', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const c = await ctx()
  if (c.error) return c.error
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await c.supabase.from('templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
