import { createClient } from '@/lib/supabase/server'
import {
  callClaudeForWords,
  buildTopicSuggestionsPrompt,
  buildWordsOnlyTopicSuggestionsPrompt,
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

  const { data: deck } = await supabase.from('decks').select('id, profile').eq('id', deckId).single()
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  const { data: cards } = await supabase.from('cards').select('word').eq('deck_id', deckId)
  const currentWords = (cards || []).map((c) => c.word).join(', ')

  const prompt = deck.profile
    ? buildTopicSuggestionsPrompt(deck.profile, currentWords)
    : buildWordsOnlyTopicSuggestionsPrompt(currentWords)

  try {
    const suggestions = await callClaudeForWords(prompt, 500)
    return Response.json({ suggestions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
