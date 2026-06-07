export async function processLeadWithAI(rawText: string) {
  const prompt = `Extract structured data from this freelance job post.
Return only valid JSON with these exact fields:
{
  "title": "clean job title",
  "description": "cleaned 2-3 sentence description",
  "budget_min": null,
  "budget_max": null,
  "skills_required": ["skill1", "skill2"],
  "project_type": "contract or ongoing",
  "client_location": "Remote or country",
  "quality_score": 5
}

Quality score rules (1-10):
- Base score: 5 points
- Has clear budget or rate: +2 points
- Has clear project scope: +2 points
- Has real company behind it: +1 point
- Remote friendly or location specified: +1 point
- Vague or too short posting: -1 point

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
