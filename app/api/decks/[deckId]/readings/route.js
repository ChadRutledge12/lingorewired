import { createClient } from '@/lib/supabase/server'
import { callClaudeForJson } from '@/lib/wordGeneration'
import { buildReadingPrompt, pickReadingTargets, READING_LENGTHS } from '@/lib/readingGeneration'

// Generate a reading from a deck's vocabulary and save it to the deck's
// reading library. Optional { scenario, length } in the body lets the
// learner steer the story before it's written.
export async function POST(request, { params }) {
  const { deckId } = await params
  const { scenario, length } = await request.json().catch(() => ({}))
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

  const { data: cards } = await supabase
    .from('cards')
    .select('word, translation, due')
    .eq('deck_id', deckId)
  if (!cards || cards.length === 0) {
    return Response.json({ error: 'Add some words to this deck first' }, { status: 400 })
  }

  const targets = pickReadingTargets(cards, new Date().toISOString())
  const safeLength = READING_LENGTHS[length] ? length : 'short'
  const prompt = buildReadingPrompt(targets, { profile: deck.profile, scenario, length: safeLength })

  let reading
  try {
    reading = await callClaudeForJson(prompt, 2500)
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }

  if (!reading?.title || !Array.isArray(reading.sentences) || reading.sentences.length === 0) {
    return Response.json({ error: 'The reading came back malformed — please try again.' }, { status: 502 })
  }

  const { data: saved, error } = await supabase
    .from('readings')
    .insert({
      deck_id: deckId,
      user_id: user.id,
      title: reading.title,
      scenario: (scenario || '').trim() || null,
      content: { sentences: reading.sentences },
    })
    .select('id')
    .single()
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ readingId: saved.id })
}
