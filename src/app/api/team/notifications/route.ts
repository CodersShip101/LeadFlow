import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { notifySlack } from '@/lib/notify'

async function adminCtx() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminSupabase()
  const { data: m } = await admin
    .from('org_members').select('org_id, role').eq('user_id', user.id).maybeSingle()
  if (!m) return { error: NextResponse.json({ error: 'Not on a team' }, { status: 403 }) }
  return { admin, user, orgId: m.org_id as string, role: m.role as string }
}

export async function GET() {
  const c = await adminCtx()
  if (c.error) return c.error
  const { data } = await c.admin.from('organizations').select('slack_webhook_url').eq('id', c.orgId).single()
  // Don't leak the full URL to non-admins; just whether it's set.
  return NextResponse.json({ configured: !!data?.slack_webhook_url, canEdit: c.role === 'admin' })
}

export async function PUT(req: NextRequest) {
  const c = await adminCtx()
  if (c.error) return c.error
  if (c.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })
  const { slackWebhookUrl } = await req.json().catch(() => ({}))
  const url = (slackWebhookUrl ?? '').trim() || null
  if (url && !/^https:\/\/hooks\.slack\.com\//.test(url)) {
    return NextResponse.json({ error: 'Enter a valid Slack incoming webhook URL' }, { status: 400 })
  }
  const { error } = await c.admin.from('organizations').update({ slack_webhook_url: url }).eq('id', c.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Send a test message so they know it works.
  if (url) await notifySlack(url, ':white_check_mark: Flaiir is now connected to this channel.')
  return NextResponse.json({ ok: true, configured: !!url })
}
