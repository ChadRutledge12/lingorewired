import { createClient } from '@/lib/supabase/server'
import {
  callClaudeForWords,
  buildTopicSuggestionsPrompt,
  buildWordsOnlyTopicSuggestionsPrompt,
  buildTitleTopicSuggestionsPrompt,
  dedupeSuggestions,
} from '@/lib/wordGeneration'

// Suggests follow-up topics for an already-saved deck, based on its current
// cards (which may have grown since the deck was created, via Amplify or
// word-cloud clusters) and the deck's stored onboarding profile when
// available. Selecting a suggestion is handled separately, by the amplify
// endpoint with a `topic` in the body.
export async function POST(request, { params }) {
  const { deckId } = await params
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

  const { data: cards } = await supabase.from('cards').select('word').eq('deck_id', deckId)
  const currentWords = (cards || []).map((c) => c.word).join(', ')

  // Empty deck: there are no words to extend from, so seed suggestions off the
  // deck's title instead. Otherwise suggest what naturally follows the set.
  const prompt = currentWords
    ? deck.profile
      ? buildTopicSuggestionsPrompt(deck.profile, currentWords)
      : buildWordsOnlyTopicSuggestionsPrompt(currentWords)
    : buildTitleTopicSuggestionsPrompt(deck.name, deck.profile)

  try {
    const suggestions = dedupeSuggestions(await callClaudeForWords(prompt, 500), currentWords)
    return Response.json({ suggestions })
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client
    // treats a 401 from this endpoint as "you're logged out" and redirects
    // to /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err.status === 401 || err.status === 403 ? 502 : err.status || 500
    return Response.json({ error: err.message }, { status })
  }
}
