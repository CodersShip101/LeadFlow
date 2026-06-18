export async function processLeadWithAI(rawText: string) {
  const prompt = `Extract structured data from this freelance/contract job post.
Return only valid JSON with these exact fields:
{
  "title": "clean job title",
  "description": "cleaned 2-3 sentence description",
  "budget_min": null,
  "budget_max": null,
  "skills_required": ["skill1", "skill2"],
  "project_type": "contract|ongoing|one-off",
  "client_location": "Remote, London, UK etc",
  "remote_status": "remote|hybrid|onsite",
  "client_name": "company name if mentioned, or null",
  "quality_score": 5
}

Extraction rules:
- Title: remove company name, location, "hiring" noise. Keep clean role title.
- Budget: parse £ symbols. If hourly (e.g. £50/hr), set budget_min=50, budget_max=null. If range (e.g. £300-£500), set both. If yearly salary, divide by 220 for daily rate.
- Skills: extract ALL mentioned tech stacks, tools, frameworks as individual skills.
- Project type: classify as "contract", "ongoing", or "one-off"
- Client location: extract the location. If "remote" or no location, set "Remote"
- Remote status: "remote", "hybrid", or "onsite"
- Client name: extract company or client name. If unclear, null.

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
      signal: AbortSignal.timeout(12000),
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
