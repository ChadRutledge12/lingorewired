import { createClient } from '@/lib/supabase/server'

// Rename a deck.
export async function PATCH(request, { params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name || !name.trim()) {
    return Response.json({ error: 'Deck name is required' }, { status: 400 })
  }

  const { error } = await supabase.from('decks').update({ name: name.trim() }).eq('id', deckId)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}

// Delete a deck (cards + review_logs cascade via FK, scoped to the owner by RLS).
export async function DELETE(request, { params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { error } = await supabase.from('decks').delete().eq('id', deckId)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
