# Flaiir Inc. — Full Product Lifecycle Operations Plan

The complete map: what a real software company does **before** building, **during** build,
at **launch**, **while running**, and at **end-of-life** — with the exact tools/skills for each,
what Flaiir already has, the gaps, and install priority. Built for "no mistakes, plan everything."

> **MCP SECURITY LAW (non-negotiable):** a 2026 audit of ~7,000 public MCP servers found 41% need
> no auth, 36.7% are SSRF-vulnerable, 30+ CVEs in 60 days. → We install ONLY official/first-party
> MCP servers (Sentry, PostHog, Stripe, Supabase, Vercel, Upstash/Context7). Least-privilege keys,
> read-only where possible, never a random community server. Never expose CI secrets to agents.

---

## PHASE 0 — BEFORE THE PRODUCT (discovery, design, architecture)
What a company does before writing code.
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| Market/user research | `last30days` (installed), WebSearch | ✅ have; run per feature |
| Product definition / PRD | PRODUCT.md, DESIGN.md | ✅ written this session |
| Backlog / roadmap | Linear or Notion MCP (official) | ⬜ gap — optional |
| Design system | `frontend-design`, `impeccable`, `design-taste-frontend` | ✅ have |
| Architecture / DB correctness | `supabase/agent-skills`, Context7 docs | 🔶 install now |

## PHASE 1 — DURING BUILD (engineering)
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| Frontend / taste | frontend-design + impeccable | ✅ have (Design Manager) |
| Backend correctness | `supabase/agent-skills` + Context7 | 🔶 install now |
| Version-exact API docs (anti-hallucination) | **Context7 MCP** (Upstash, official) | 🔶 install now |
| E2E testing | Playwright (installed) + Test Writer skill | 🔶 add Test Writer |
| Code review (peer) | `ponytail` + `code-review` plugin + cross-model critique | ✅ have |
| SAST security scan | **Semgrep** + `aikido` plugin (installed) | 🔶 add Semgrep |

## PHASE 2 — PRE-LAUNCH HARDENING
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| Full API hardening (auth/validation/errors) | our Backend Manager loop | 🟡 18/38 routes done |
| Payment-path audit | CEO does (checkout, stripe webhook sig) | ⬜ pending (task #2) |
| Accessibility (WCAG) audit | impeccable a11y checks + axe | ⬜ gap |
| Perf / Lighthouse | Vercel perf skill + Lighthouse | ⬜ gap |
| Legal pages (Terms, Privacy, cookies) | verify exist + honest | ⬜ verify |

## PHASE 3 — LAUNCH (go-live)
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| Deploy | Vercel CLI (installed) + Vercel MCP | ✅ deploy manually |
| **Error tracking** | **Sentry MCP** (official) — CATCHES PROD BUGS | 🔴 **GAP — none installed** |
| **Product analytics + session replay** | **PostHog MCP** (official) — funnels, replay | 🔴 **GAP — none** |
| SEO indexing | Google Search Console MCP + GA4 MCP | 🔴 GAP |
| Launch channels | ProductHunt, LaunchList, founder LinkedIn | ⬜ manual |

## PHASE 4 — WHILE RUNNING (operate & grow)
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| Live error triage | Sentry MCP (AI root-cause) | 🔴 GAP |
| Funnels / retention / A/B | PostHog (feature flags + experiments) | 🔴 GAP |
| Billing operations | **Stripe MCP** (official) — subs, disputes, invoices | 🔶 high value (we use Stripe) |
| Transactional email | SendGrid/Resend (already wired for reminders) | ✅ have |
| Customer support / feedback | support inbox + PostHog surveys | ⬜ gap |
| Uptime / infra monitoring | Datadog or Vercel observability | ⬜ gap |
| Growth marketing | GA4 + GSC + Google Ads MCP | ⬜ later |

## PHASE 5 — END OF PRODUCT LIFE (sunset / EOL)
The part most people forget — and legally required for UK/EU users.
| Need | Tool/Skill | Flaiir status |
|---|---|---|
| **GDPR data export** (right to portability) | full account export endpoint | 🔴 GAP (partial CSV only) |
| **GDPR data deletion** (right to be forgotten) | account-delete + cascade purge | 🔴 GAP |
| Data retention policy | scheduled purge of stale leads/PII | ⬜ gap |
| Graceful feature deprecation | flag → sunset banner → remove | ⬜ future |
| Compliance evidence | SOC2/GDPR audit logs | ⬜ future |

## CROSS-CUTTING (every phase)
- **Security:** Semgrep + aikido, MCP least-privilege, secret hygiene, dependency audit.
- **Compliance:** GDPR (UK/EU users) — export + delete + retention are the legal minimum.
- **Docs/context:** Context7 for version-exact APIs; keep PRODUCT.md/DESIGN.md current.
- **Observability trio:** Sentry (errors) + PostHog (product) + uptime — the "can we see prod?" layer.

---

## PRIORITISED INSTALL LIST (official/first-party only)

**NOW (unblocks current build + real gaps):**
1. `supabase/agent-skills` — backend correctness (`npx -y skills add supabase/agent-skills`)
2. Context7 MCP — version-exact docs (`claude mcp add context7 -- npx -y @upstash/context7-mcp`)
3. Semgrep — SAST security
4. Test Writer skill — e2e authoring

**SOON (launch-readiness — the biggest real gaps for a live SaaS):**
5. **Sentry MCP** — error tracking (Flaiir currently flies blind in prod)
6. **PostHog MCP** — product analytics, session replay, funnels, feature flags/A-B
7. **Stripe MCP** — billing operations (we already charge via Stripe)

**LATER (growth + compliance):**
8. Google Search Console + GA4 MCP — SEO/marketing intelligence
9. GDPR export + delete endpoints (build, not install) — legal for UK/EU
10. Linear/Notion MCP — backlog (optional)

## Sources
Composio 2026 MCP roundup, Builder.io best-MCP-2026, Amplitude product-analytics-MCP,
CSO Online MCP-security, Microsoft CI/CD-agentic-security, Stripe MCP docs, PostHog/Sentry Claude
skills (mcpmarket), VoltAgent/awesome-agent-skills, rohitg00/awesome-claude-code-toolkit.
