import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Server-side sign-out: clears the session cookies via Set-Cookie on the
// response. The client-only signOut() can fail silently (expired token,
// network) and leave cookies behind — then the auth proxy sees a session and
// bounces /auth/login straight back to /dashboard.
export async function POST() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
