export async function processLeadWithAI(rawText: string) {
  // Bigger window than the other fields need, because responsibilities and
  // benefits usually live further down a post. Still small enough to stay fast.
  rawText = (rawText || '').substring(0, 2200)
  const prompt = `Extract structured data from this freelance/contract job post.
Return only valid JSON with these exact fields:
{
  "title": "clean job title",
  "description": "cleaned 2-3 sentence description",
  "responsibilities": ["key task or duty", "..."],
  "benefits": ["perk or benefit", "..."],
  "budget_min": null,
  "budget_max": null,
  "skills_required": ["skill1", "skill2"],
  "project_type": "contract|ongoing|one-off",
  "client_location": "Remote, London, UK etc",
  "remote_status": "remote|hybrid|onsite",
  "client_name": "company name if mentioned, or null",
  "ir35": "inside|outside|null",
  "quality_score": 5
}

Extraction rules:
- Title: remove company name, location, "hiring" noise. Keep clean role title.
- Description: cleaned 2-3 sentence overview of the role.
- Responsibilities: 3-6 concise bullet points of what the person will actually do (tasks, duties, deliverables). Each a short phrase, not a full sentence. Empty array if none stated.
- Benefits: perks, compensation extras, or what's offered (e.g. "Flexible hours", "Equity", "Health insurance", "Fully remote"). Short phrases. Empty array if none stated.
- Budget: parse £ symbols. If hourly (e.g. £50/hr), set budget_min=50, budget_max=null. If range (e.g. £300-£500), set both. If yearly salary, divide by 220 for daily rate.
- Skills: extract ALL mentioned tech stacks, tools, frameworks as individual skills.
- Project type: classify as "contract", "ongoing", or "one-off"
- Client location: extract the location. If "remote" or no location, set "Remote"
- Remote status: "remote", "hybrid", or "onsite"
- Client name: extract company or client name. If unclear, null.
- IR35: for UK contracts, detect IR35 status. "inside" or "outside" if stated/implied, otherwise null.

Quality score rules (1-10):
- Base: 5
- Has clear budget/rate: +2
- Has clear project scope with deliverables: +2
- Has company/client name: +1
- Location specified (not just "Remote"): +1
- Has specific tech stack / skills: +1
- Vague, too short (< 100 chars), or no details: -2
- Likely recruiter spam or low-effort post: -3

Return ONLY raw JSON. No markdown. No explanation.

Job post:
${rawText}`

  const response = await fetch(
    "https://opencode.ai/zen/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash-free",
        // Pure extraction needs no chain-of-thought. "low" cuts response time
        // from ~21s to ~7s, keeping us well inside the function time budget.
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Always respond with valid JSON only. No markdown, no explanation, just raw JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      // Fail fast so one slow call never hangs the whole scrape run.
      signal: AbortSignal.timeout(18000),
    },
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Zen API error (${response.status}): ${err.substring(0, 200)}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content
  const clean = text.replace(/```json|```/g, "").trim()
  return JSON.parse(clean)
}
