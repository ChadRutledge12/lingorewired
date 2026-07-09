import { createClient } from '@/lib/supabase/server'
import { newCardFields } from '@/lib/fsrs'

// Save a generated batch of words as a new deck of review cards.
export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name || '').trim()
  const words = Array.isArray(body.words) ? body.words : []
  const profile = body.profile && typeof body.profile === 'object' ? body.profile : null

  if (!name) {
    return Response.json({ error: 'Deck name is required' }, { status: 400 })
  }
  // words may be empty — manual decks start blank and get cards added by hand.

  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .insert({ user_id: user.id, name, profile })
    .select('id')
    .single()
  if (deckErr) {
    return Response.json({ error: deckErr.message }, { status: 500 })
  }

  if (words.length === 0) {
    return Response.json({ deckId: deck.id, count: 0 })
  }

  const now = new Date()
  const rows = words.map((w) => ({
    deck_id: deck.id,
    user_id: user.id,
    word: w.word,
    translation: w.translation ?? null,
    part_of_speech: w.part_of_speech ?? null,
    example: w.example ?? null,
    example_translation: w.example_translation ?? null,
    tier: w.tier ?? null,
    ...newCardFields(now),
  }))

  const { error: cardsErr } = await supabase.from('cards').insert(rows)
  if (cardsErr) {
    // Roll back the empty deck so we don't leave an orphan.
    await supabase.from('decks').delete().eq('id', deck.id)
    return Response.json({ error: cardsErr.message }, { status: 500 })
  }

  return Response.json({ deckId: deck.id, count: rows.length })
}
