import { createClient } from '@/lib/supabase/server'
import { buildProfilePrompt, callClaudeForWords } from '@/lib/wordGeneration'

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const profile = await request.json()

  const requiredArrays = ['goals', 'interests', 'contexts']
  const missing = requiredArrays.filter(key => !Array.isArray(profile[key]))
  if (missing.length > 0) {
    return Response.json(
      { error: `Missing or invalid fields: ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  const count = profile.addMore ? 6 : 12
  const prompt = buildProfilePrompt(profile, count, profile.existingWords)

  try {
    const words = await callClaudeForWords(prompt)
    return Response.json({ words })
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client
    // treats a 401 from this endpoint as "you're logged out" and redirects
    // to /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err.status === 401 || err.status === 403 ? 502 : err.status || 500
    return Response.json({ error: err.message }, { status })
  }
}
