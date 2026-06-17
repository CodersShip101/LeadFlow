// app/api/leads/[id]/route.ts
// ---------------------------------------------------------------------------
// GET /api/leads/:id — full detail for one lead, freshly scored for this user.
// The source_url is gated: revealed to Pro, withheld (with an upgrade hint)
// for Free. Viewing also flips the lead's pipeline "viewed" state if tracked.
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { scoreLead, type Lead } from '@/lib/scoring';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('skills, hourly_rate, plan')
    .eq('id', user.id)
    .single();

  const { data: row, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const scored = scoreLead(row as unknown as Lead, {
    skills: profile?.skills ?? [],
    hourly_rate: profile?.hourly_rate ?? null,
  });

  const isPro = profile?.plan === 'pro';

  return NextResponse.json({
    id: row.id,
    source: row.source,
    title: row.title,
    description: row.description,
    budget: row.budget_text,
    location: row.location,
    type: row.project_type,
    ir35: row.ir35,
    postedAt: row.posted_at,
    applicants: row.applicants,
    skills: row.required_skills,
    score: scored.score,
    sub: scored.sub,
    why: scored.why,
    skillDetail: scored.skillDetail,
    sourceUrl: isPro ? row.source_url : null,
    sourceLocked: !isPro,
  });
}
