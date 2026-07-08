export async function POST(request) {
  const profile = await request.json()

  const requiredArrays = ['goals', 'interests', 'contexts']
  const missing = requiredArrays.filter(key => !Array.isArray(profile[key]))
  if (missing.length > 0) {
    return Response.json(
      { error: `Missing or invalid fields: ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  const prompt = `You are an expert Spanish language teacher.

A student has just learned these Spanish words: ${profile.currentWords}

Their profile:
- Level: ${profile.level}
- Goals: ${profile.goals.join(', ')}
- Interests: ${profile.interests.join(', ')}
- Contexts: ${profile.contexts.join(', ')}
- Location: ${profile.location}

Based on their current word set and profile, suggest 4 natural follow-up vocabulary topics they should explore next. Think like a teacher — what gaps do you notice? What would logically complement what they've learned?

Return ONLY a JSON array with this structure:
[
  { "topic": "Emergency phrases", "reason": "essential for safety on the Camino" },
  { "topic": "Weather vocabulary", "reason": "useful for outdoor activities" }
]

No explanation, no markdown, just the JSON array.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()

  if (!response.ok) {
    return Response.json(
      { error: data.error?.message || 'Failed to generate suggestions' },
      { status: response.status }
    )
  }

  try {
    const text = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)
    return Response.json({ suggestions })
  } catch (err) {
    return Response.json({ error: 'Failed to parse suggestions' }, { status: 502 })
  }
}