# LeadFlow — Backend

Drop-in Next.js (App Router) + Supabase + Stripe backend for the LeadFlow
dashboard. Every file here implements the data side of a specific UX rule from
the course material, so the frontend's conversion features are backed by real
data instead of hard-coded values.

## What maps to what

| UX rule (source) | Where it lives |
|---|---|
| Weighted 40/30/20/10 scoring + sub-scores + "why" | `lib/scoring.ts` |
| Personalize by behaviour (new / returning / power) | `lib/segment.ts`, used in `app/api/leads/route.ts` |
| Crown the best lead (halo effect) | `topMatchId` in `app/api/leads/route.ts` |
| Specific numbers beat round numbers | `app/api/stats/route.ts` (counts, never hard-coded) |
| Social proof ("N applied", "340 on Pro") | `leads.applicants`, `proUsers` in `stats` |
| Smarter search (recent + popular) | `app/api/search/suggest/route.ts` + `popular_searches` RPC |
| Free wall on *volume*, not on acting | `app/api/apply/route.ts` (5/mo cap → 402) |
| Pipeline as a CRM with stages/timeline | `app/api/pipeline/route.ts` |
| Source links gated to Pro | `app/api/leads/[id]/route.ts` |
| "First 7 days free" reassurance is real | `trial_period_days` in `app/api/checkout/route.ts` |
| Annual toggle / −20% | two Stripe prices in `app/api/checkout/route.ts` |

## File tree

```
supabase/schema.sql                  tables, RLS, triggers, RPCs
lib/supabase.ts                      server + admin clients, requireUser()
lib/scoring.ts                       pure scoring model (unit-testable)
lib/segment.ts                       behaviour segmentation + copy
app/api/leads/route.ts               GET ranked feed (segment-aware)
app/api/leads/[id]/route.ts          GET one lead (Pro source gating)
app/api/apply/route.ts               POST apply (quota-enforced) → pipeline
app/api/saved/route.ts               GET/POST/DELETE bookmarks
app/api/pipeline/route.ts            GET grouped / PATCH stage moves
app/api/search/suggest/route.ts      GET recent+popular / POST log
app/api/stats/route.ts               GET real dashboard + social-proof numbers
app/api/checkout/route.ts            POST Stripe Checkout (trial + annual)
app/api/webhooks/stripe/route.ts     POST sync subscription → profiles.plan
```

## Setup

1. **Dependencies**
   ```bash
   npm i @supabase/ssr @supabase/supabase-js stripe
   ```
2. **Path alias** — these imports use `@/lib/...`. In `tsconfig.json`:
   ```json
   { "compilerOptions": { "paths": { "@/*": ["./*"] } } }
   ```
3. **Database** — paste `supabase/schema.sql` into the Supabase SQL editor and run.
4. **Env** — copy `.env.example` to `.env.local` and fill in the values.
5. **Stripe** — create two recurring prices (monthly £49, annual £39/mo billed
   yearly), set the webhook endpoint to `/api/webhooks/stripe`, and paste the
   signing secret into `STRIPE_WEBHOOK_SECRET`.
6. **Monthly reset** — schedule `select public.reset_monthly_quota();` on the
   1st of each month (Supabase scheduled job / pg_cron).

## Notes / decisions

- **The free wall is deliberately on application *volume*, not on viewing scored
  leads or the pipeline.** Free users get real value; upgrading feels like
  outgrowing the tier. If you'd rather gate on something else, the only change
  is in `app/api/apply/route.ts`.
- **Scoring is a pure function** — no DB calls inside `lib/scoring.ts`. That
  keeps it fast (runs over a 200-lead batch per request) and unit-testable, and
  lets you reuse it in a scraper post-process step if you want scores
  precomputed.
- **The scrapers themselves are out of scope here** — these endpoints assume a
  separate job fills `public.leads`. The `detail_score` and `applicants` columns
  are where that job records listing completeness and competition.
- RLS is on for every user-owned table; cross-user reads (popular searches, Pro
  count) go through `SECURITY DEFINER` RPCs or the service-role client so no
  individual rows leak.
