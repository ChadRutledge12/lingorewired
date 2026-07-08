import { createClient } from '@/lib/supabase/server'

const EDITABLE_FIELDS = ['word', 'translation', 'part_of_speech', 'example', 'example_translation']

// Edit a card's content (not its FSRS scheduling state).
export async function PATCH(request, { params }) {
  const { cardId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const updates = {}
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === 'string') updates[field] = body[field].trim()
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  if (updates.word === '') {
    return Response.json({ error: 'Word cannot be empty' }, { status: 400 })
  }

  const { error } = await supabase.from('cards').update(updates).eq('id', cardId)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}

// Delete a single card.
export async function DELETE(request, { params }) {
  const { cardId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
