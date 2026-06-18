import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/reset-password`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const resetLink = data?.properties?.action_link
    if (!resetLink) {
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Flaiir <onboarding@resend.dev>',
        to: [email],
        subject: 'Reset your Flaiir password',
        html: `<p>Click the link below to reset your password:</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, ignore this email.</p>`,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Failed to send email: ${err.substring(0, 200)}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
