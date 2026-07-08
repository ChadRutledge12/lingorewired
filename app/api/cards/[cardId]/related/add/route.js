import { createClient } from '@/lib/supabase/server'
import { newCardFields } from '@/lib/fsrs'
import { normalizeWord } from '@/lib/normalizeWord'

// Turns a card's cached related-word cluster into real, FSRS-tracked cards in
// the same deck, so "Review this cluster" has something to actually review.
// Related words that already exist in the deck (by normalized word) reuse
// that existing card instead of creating a duplicate.
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
    .select('id, deck_id, word, related_words')
    .eq('id', cardId)
    .single()
  if (!card) {
    return Response.json({ error: 'Card not found' }, { status: 404 })
  }
  if (!card.related_words || card.related_words.length === 0) {
    return Response.json({ error: 'No related words to add yet — open the word cloud first' }, { status: 400 })
  }

  const { data: deckCards } = await supabase.from('cards').select('id, word').eq('deck_id', card.deck_id)
  const existingByNormalized = new Map((deckCards || []).map((c) => [normalizeWord(c.word), c.id]))

  const toInsert = []
  const reusedIds = []
  for (const related of card.related_words) {
    const key = normalizeWord(related.word)
    const existingId = existingByNormalized.get(key)
    if (existingId) {
      reusedIds.push(existingId)
    } else {
      toInsert.push(related)
    }
  }

  const now = new Date()
  let insertedIds = []
  if (toInsert.length > 0) {
    const rows = toInsert.map((w) => ({
      deck_id: card.deck_id,
      user_id: user.id,
      word: w.word,
      translation: w.translation ?? null,
      part_of_speech: w.part_of_speech ?? null,
      example: w.example ?? null,
      example_translation: w.example_translation ?? null,
      tier: w.tier ?? null,
      ...newCardFields(now),
    }))
    const { data: inserted, error: insertErr } = await supabase.from('cards').insert(rows).select('id')
    if (insertErr) {
      return Response.json({ error: insertErr.message }, { status: 500 })
    }
    insertedIds = inserted.map((c) => c.id)
  }

  const cardIds = [card.id, ...reusedIds, ...insertedIds]
  return Response.json({ deckId: card.deck_id, cardIds })
}
