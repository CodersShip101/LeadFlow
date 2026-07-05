import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
    const org = orgRows?.[0]
    if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

    const { email, role = 'member' } = await req.json().catch(() => ({}))
    if (typeof email !== 'string' || email.length > 320 || !email.includes('@'))
      return NextResponse.json({ error: 'valid email required' }, { status: 400 })
    if (typeof role !== 'string' || role.length > 200)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    // Reject inviting someone who's already on the team. Resolve the email to a
    // user via the admin client (RLS hides other users' profiles), then check
    // membership.
    const admin = createAdminSupabase()
    const { data: existingProfile } = await admin
      .from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle()
    if (existingProfile) {
      const { data: alreadyMember } = await admin
        .from('org_members').select('user_id')
        .eq('org_id', org.org_id).eq('user_id', existingProfile.id).maybeSingle()
      if (alreadyMember) {
        return NextResponse.json({ error: 'already_member', message: 'They’re already on your team.' }, { status: 409 })
      }
    }

    const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
      supabase.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id),
      supabase.from('org_invites').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id).is('accepted_at', null),
    ])
    if ((memberCount ?? 0) + (inviteCount ?? 0) >= org.seats) {
      return NextResponse.json(
        { error: 'no_seats', message: 'All seats are in use. Add seats to invite more teammates.' },
        { status: 402 },
      )
    }

    const { data: invite, error } = await supabase
      .from('org_invites')
      .upsert(
        { org_id: org.org_id, email: email.toLowerCase(), role, invited_by: user.id },
        { onConflict: 'org_id,email' },
      )
      .select('token')
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!
    const acceptUrl = `${origin}/api/team/accept?token=${invite!.token}`

    // Email the invitee the accept link.
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F5F7;margin:0;padding:24px">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;margin:0 auto">
      <tr><td style="padding:28px 28px 8px">
        <h1 style="font-size:18px;font-weight:700;margin:0;color:#111827">You've been invited to a team on Flaiir</h1>
        <p style="font-size:14px;color:#6B7280;margin:10px 0 0;line-height:1.5">Join your team's shared lead pool, pipeline and templates. Click below to accept (you'll sign in or create an account with this email).</p>
      </td></tr>
      <tr><td style="padding:22px 28px 28px">
        <a href="${acceptUrl}" style="background:#111827;color:#C4F000;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;display:inline-block">Accept invitation</a>
      </td></tr>
      <tr><td style="padding:0 28px 24px;font-size:11px;color:#9CA3AF;word-break:break-all">Or paste this link: ${acceptUrl}</td></tr>
    </table>
  </body></html>`

    const sent = await sendEmail({
      to: email.toLowerCase(),
      subject: "You've been invited to a Flaiir team",
      html,
    })

    return NextResponse.json({ ok: true, acceptUrl, emailed: sent.ok })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Cancel (revoke) a pending invite before it's accepted. Admin only.
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
    const org = orgRows?.[0]
    if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

    const { email } = await req.json().catch(() => ({}))
    if (typeof email !== 'string' || !email.includes('@'))
      return NextResponse.json({ error: 'valid email required' }, { status: 400 })

    // Only unaccepted invites can be cancelled; an accepted one is a real member now.
    const { error } = await supabase
      .from('org_invites')
      .delete()
      .eq('org_id', org.org_id)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
