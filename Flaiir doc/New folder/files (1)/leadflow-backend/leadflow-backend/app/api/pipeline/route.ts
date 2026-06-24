// app/api/pipeline/route.ts
// ---------------------------------------------------------------------------
// The mini-CRM.
//   GET   /api/pipeline                       -> { interested:[], applied:[], won:[] }
//   PATCH /api/pipeline {applicationId, stage} -> move a card between stages
// Stage history is what powers the visual timeline on each card.
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const STAGES = ['interested', 'applied', 'won', 'lost'] as const;

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('applications')
    .select('id, stage, note, updated_at, lead:leads(id, source, title, budget_text, posted_at)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped: Record<string, any[]> = { interested: [], applied: [], won: [] };
  for (const row of data ?? []) {
    if (row.stage === 'lost') continue;
    grouped[row.stage]?.push({
      applicationId: row.id,
      stage: row.stage,
      note: row.note,
      lead: row.lead,
    });
  }
  return NextResponse.json(grouped);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { applicationId, stage, note } = await req.json().catch(() => ({}));
  if (!STAGES.includes(stage))
    return NextResponse.json({ error: 'invalid stage' }, { status: 400 });

  const patch: Record<string, unknown> = { stage, updated_at: new Date().toISOString() };
  if (note !== undefined) patch.note = note;
  if (stage === 'won' || stage === 'lost') patch.outcome_at = new Date().toISOString();

  // RLS guarantees the user can only touch their own application rows.
  const { error } = await supabase
    .from('applications')
    .update(patch)
    .eq('id', applicationId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
