import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// GDPR right to erasure. Requires an explicit confirmation token to avoid
// accidental deletes. Removes all user-owned rows in FK-safe order, then the
// auth user itself. Irreversible.
export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { confirm } = await req.json().catch(() => ({}))
  if (confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  try {
    const admin = createAdminSupabase()
    const uid = user.id

    // Owned teams first — deleting the org removes its members via FK cascade.
    const { data: ownedOrgs } = await admin.from('organizations').select('id').eq('owner_id', uid)
    for (const org of ownedOrgs ?? []) {
      await admin.from('org_members').delete().eq('org_id', org.id)
      await admin.from('organizations').delete().eq('id', org.id)
    }

    // Child rows this user owns.
    await admin.from('org_members').delete().eq('user_id', uid)
    await admin.from('applications').delete().eq('freelancer_id', uid)
    await admin.from('saved_leads').delete().eq('user_id', uid)
    await admin.from('templates').delete().eq('owner_id', uid)
    await admin.from('search_log').delete().eq('user_id', uid)
    await admin.from('profiles').delete().eq('id', uid)

    // Finally the auth identity.
    const { error: authErr } = await admin.auth.admin.deleteUser(uid)
    if (authErr) {
      console.error('auth.admin.deleteUser failed:', authErr)
      return NextResponse.json({ error: 'Could not fully delete account' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Account deletion failed:', err)
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 })
  }
}
