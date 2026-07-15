import { createClient } from '@/lib/supabase/server'
import { buildTitleWordsPrompt, callClaudeForWords } from '@/lib/wordGeneration'

const SUGGEST_COUNT = 12

// Suggests starter words for a deck based on its title (for filling an empty
// manual deck). Returns the words WITHOUT inserting — the learner picks which
// to add. Optional { topic } narrows the suggestions to a sub-theme.
export async function POST(request, { params }) {
  const { deckId } = await params
  const { topic } = await request.json().catch(() => ({}))
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: deck } = await supabase.from('decks').select('id, name, profile').eq('id', deckId).single()
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  const prompt = buildTitleWordsPrompt(deck.name, SUGGEST_COUNT, { profile: deck.profile, topic })
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
