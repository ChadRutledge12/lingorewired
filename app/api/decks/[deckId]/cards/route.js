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
  const word = (body.word || '').trim()
  if (!word) {
    return Response.json({ error: 'Word is required' }, { status: 400 })
  }

  const { data: card, error } = await supabase
    .from('cards')
    .insert({
      deck_id: deckId,
      user_id: user.id,
      word,
      translation: (body.translation || '').trim() || null,
      part_of_speech: body.part_of_speech || null,
      example: (body.example || '').trim() || null,
      example_translation: (body.example_translation || '').trim() || null,
      tier: null, // manual cards don't belong to a generated tier
      ...newCardFields(new Date()),
    })
    .select()
    .single()
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ card })
}
