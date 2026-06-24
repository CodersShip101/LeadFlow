// app/api/apply/route.ts
// ---------------------------------------------------------------------------
// POST /api/apply   body: { leadId: string }
// The single workflow action: applying drops the lead straight into the
// pipeline (stage = "applied"). Free users are capped at 5 applications per
// month; the cap is enforced server-side (never trust the client) and returns
// a 402 so the UI can show the upgrade modal.
//
// Note on the product decision: the free wall is on *applications volume*, not
// on viewing scored leads or seeing the pipeline — so free users still get
// real value and the upgrade feels like outgrowing the tier.
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const FREE_MONTHLY_CAP = 5;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId } = await req.json().catch(() => ({}));
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, applications_this_month')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 });

  // Enforce the free-tier cap.
  if (profile.plan === 'free' && profile.applications_this_month >= FREE_MONTHLY_CAP) {
    return NextResponse.json(
      {
        error: 'quota_reached',
        message: `Free plan is limited to ${FREE_MONTHLY_CAP} applications per month.`,
        cap: FREE_MONTHLY_CAP,
      },
      { status: 402 }, // Payment Required — UI shows the upgrade modal
    );
  }

  // Upsert into the pipeline as "applied" (idempotent on user+lead).
  const { error: upErr } = await supabase.from('applications').upsert(
    {
      user_id: user.id,
      lead_id: leadId,
      stage: 'applied',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lead_id' },
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Increment the user's counters (drives quota + behaviour segment).
  const { error: incErr } = await supabase.rpc('increment_application_counters', {
    p_user: user.id,
  });
  // Fallback if the RPC isn't installed: do a plain update.
  if (incErr) {
    await supabase
      .from('profiles')
      .update({
        applications_this_month: (profile.applications_this_month ?? 0) + 1,
      })
      .eq('id', user.id);
  }

  return NextResponse.json({ ok: true, stage: 'applied' });
}

// ---------------------------------------------------------------------------
// Companion SQL (add to schema.sql) — atomic counter increment:
//
// create or replace function public.increment_application_counters(p_user uuid)
// returns void language sql security definer set search_path = public as $$
//   update public.profiles
//      set applications_this_month = applications_this_month + 1,
//          applications_total      = applications_total + 1,
//          updated_at              = now()
//    where id = p_user;
// $$;
// ---------------------------------------------------------------------------
