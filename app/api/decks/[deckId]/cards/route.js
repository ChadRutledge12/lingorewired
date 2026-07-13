import { createClient } from '@/lib/supabase/server'
import { newCardFields } from '@/lib/fsrs'

// Manually add a single card to a deck — for learners bringing their own
// vocabulary (textbooks, classes, tutors) rather than generating it.
export async function POST(request, { params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: deck } = await supabase.from('decks').select('id').eq('id', deckId).single()
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  const body = await request.json()
  const now = new Date()

  const toRow = (w) => ({
    deck_id: deckId,
    user_id: user.id,
    word: (w.word || '').trim(),
    translation: (w.translation || '').trim() || null,
    part_of_speech: w.part_of_speech || null,
    example: (w.example || '').trim() || null,
    example_translation: (w.example_translation || '').trim() || null,
    tier: w.tier || null,
    ...newCardFields(now),
  })

  // Bulk mode: { words: [...] } — used when accepting a set of AI suggestions
  // to fill a deck. Single mode: the card fields directly.
  if (Array.isArray(body.words)) {
    const rows = body.words.map(toRow).filter((r) => r.word)
    if (rows.length === 0) {
      return Response.json({ error: 'No words to add' }, { status: 400 })
    }
    const { data: cards, error } = await supabase.from('cards').insert(rows).select()
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ cards })
  }

  const row = toRow(body)
  if (!row.word) {
    return Response.json({ error: 'Word is required' }, { status: 400 })
  }
  const { data: card, error } = await supabase.from('cards').insert(row).select().single()
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ card })
}
