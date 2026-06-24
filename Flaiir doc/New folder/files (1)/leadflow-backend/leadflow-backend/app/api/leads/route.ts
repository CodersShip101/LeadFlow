// app/api/leads/route.ts
// ---------------------------------------------------------------------------
// GET /api/leads?score=8&source=reddit&q=react
// Returns the ranked feed for the signed-in user, with:
//   • weighted scoring + sub-scores + "why"      (lib/scoring)
//   • behaviour segment + tailored greeting/banner (lib/segment)
//   • social-proof applicant counts                (from the row)
//   • a "topMatchId" so the UI can crown the best lead (halo effect)
// Free vs Pro only changes whether source_url is revealed (handled in /[id]
// and here we simply omit it from the list payload for free users).
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rankLeads, type Lead } from '@/lib/scoring';
import { segmentOf, SEGMENT_CONFIG } from '@/lib/segment';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Profile (skills, rate, plan, activity) — drives scoring + segmentation.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, skills, hourly_rate, plan, applications_total, days_active')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 });

  // Filters from query string.
  const sp = req.nextUrl.searchParams;
  const sourceFilter = sp.get('source');
  const scoreFilter = sp.get('score'); // "7" | "8"
  const q = sp.get('q')?.toLowerCase();

  // Pull the active catalogue (RLS lets any authed user read leads).
  let query = supabase
    .from('leads')
    .select(
      'id, source, title, description, budget_text, budget_min, budget_max, location, project_type, required_skills, ir35, posted_at, applicants, detail_score, source_url',
    )
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('posted_at', { ascending: false })
    .limit(200);

  if (sourceFilter) query = query.eq('source', sourceFilter);

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Score + rank.
  const ranked = rankLeads(rows as unknown as Lead[], {
    skills: profile.skills ?? [],
    hourly_rate: profile.hourly_rate,
  });

  // The single best lead gets crowned (only meaningful with no filters applied).
  const noFilters = !sourceFilter && !scoreFilter && !q;
  const topMatchId = noFilters && ranked.length ? ranked[0].lead.id : null;

  // Apply score / text filters AFTER ranking (so "topMatch" reflects the true best).
  let visible = ranked;
  if (scoreFilter === '8') visible = visible.filter((r) => r.score >= 8);
  else if (scoreFilter === '7') visible = visible.filter((r) => r.score >= 7);
  if (q) {
    visible = visible.filter(
      (r) =>
        (rows as any[]).find((x) => x.id === r.lead.id)?.title?.toLowerCase().includes(q) ||
        (rows as any[]).find((x) => x.id === r.lead.id)?.description?.toLowerCase().includes(q),
    );
  }

  const isPro = profile.plan === 'pro';
  const byId = new Map((rows as any[]).map((x) => [x.id, x]));

  const leads = visible.map((r) => {
    const row = byId.get(r.lead.id);
    return {
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
      score: r.score,
      sub: r.sub,
      why: r.why,
      skillDetail: r.skillDetail,
      // Source URL only revealed to Pro (free-tier gate lives on the link, not the apply).
      sourceUrl: isPro ? row.source_url : null,
      isTopMatch: row.id === topMatchId,
    };
  });

  const seg = segmentOf({
    applications_total: profile.applications_total ?? 0,
    days_active: profile.days_active ?? 0,
  });
  const cfg = SEGMENT_CONFIG[seg];

  return NextResponse.json({
    leads,
    meta: {
      plan: profile.plan,
      segment: seg,
      greeting: cfg.greeting(profile.full_name?.split(' ')[0] || 'there'),
      banner: cfg.banner ?? null,
      emphasis: cfg.emphasis,
      topMatchId,
    },
  });
}
