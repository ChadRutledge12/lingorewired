import { createClient } from '@/lib/supabase/server'
import { callClaudeForWords, WORD_FIELDS_SPEC } from '@/lib/wordGeneration'

const RELATED_COUNT = 5

// Related words carry the full card field set (not just word/translation) so
// that "Review this cluster" can turn them into real, example-backed review
// cards later without a second generation round-trip.
function buildRelatedWordsPrompt(card) {
  return `You are a Spanish vocabulary expert helping a language learner see a word in context.

The learner is studying this word: "${card.word}" (${card.translation})
${card.example ? `Used in context: "${card.example}"` : ''}

Generate ${RELATED_COUNT} Spanish words that would naturally appear alongside this word in real conversation — words that answer it, complete it, or commonly co-occur with it. For example, if the word is a question about eating, generate foods; if it's a verb, generate typical objects used with it; if it's a noun, generate closely associated nouns or descriptive words.

For each, include a short connector (1-3 words, like "con" or "en el" or "que necesita") ONLY if there's a natural grammatical link between it and the main word — otherwise use null.

Return ONLY a JSON array, each item shaped exactly as:
{
${WORD_FIELDS_SPEC},
  "connector": "..." or null
}`
}

// Returns a cached related-word cluster for a card, generating (and caching)
// one on first request. Scoped to the card's owner via RLS.
export async function POST(request, { params }) {
  const { cardId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: card } = await supabase
    .from('cards')
    .select('id, word, translation, example, related_words')
    .eq('id', cardId)
    .single()
  if (!card) {
    return Response.json({ error: 'Card not found' }, { status: 404 })
  }

  if (card.related_words) {
    return Response.json({ related: card.related_words, cached: true })
  }

  let related
  try {
    related = await callClaudeForWords(buildRelatedWordsPrompt(card), 1500)
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client
    // treats a 401 from this endpoint as "you're logged out" and redirects
    // to /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err.status === 401 || err.status === 403 ? 502 : err.status || 500
    return Response.json({ error: err.message }, { status })
  }

  // Best-effort cache write — a failure here shouldn't fail the request,
  // it just means the next click regenerates instead of hitting cache.
  await supabase.from('cards').update({ related_words: related }).eq('id', cardId)

  return Response.json({ related, cached: false })
}
