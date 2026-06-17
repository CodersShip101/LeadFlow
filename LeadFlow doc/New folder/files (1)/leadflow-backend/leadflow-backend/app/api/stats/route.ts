// app/api/stats/route.ts
// ---------------------------------------------------------------------------
// GET /api/stats — the real numbers behind the feed's stat tiles and the
// "specific numbers beat round numbers" rule. Everything here is counted from
// the database, never hard-coded, so the social proof stays honest.
// ---------------------------------------------------------------------------
import { NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString();

  // Leads scanned this week / previous week → exact count + delta.
  const [{ count: scannedWeek }, { count: scannedPrevWeek }, { count: saved }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('posted_at', weekAgo),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('posted_at', twoWeeksAgo)
        .lt('posted_at', weekAgo),
      supabase
        .from('saved_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

  const delta =
    scannedPrevWeek && scannedPrevWeek > 0
      ? Math.round(((scannedWeek! - scannedPrevWeek) / scannedPrevWeek) * 100)
      : null;

  // Social proof: how many freelancers are on Pro (cross-user → admin client).
  const admin = createAdminClient();
  const { count: proUsers } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'pro');

  return NextResponse.json({
    scannedThisWeek: scannedWeek ?? 0,
    scannedDeltaPct: delta, // e.g. 12  -> "+12% vs last week"
    saved: saved ?? 0,
    proUsers: proUsers ?? 0, // -> "Join 340 freelancers on Pro"
  });
}
