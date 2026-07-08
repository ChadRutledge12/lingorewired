import { createClient } from '@/lib/supabase/server'
import { rate } from '@/lib/fsrs'

// Apply an FSRS rating to a card: reschedule it and log the review.
export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { cardId, rating } = await request.json()
  if (!cardId || !rating) {
    return Response.json({ error: 'cardId and rating are required' }, { status: 400 })
  }

  // RLS guarantees this only returns the user's own card.
  const { data: card, error: loadErr } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single()
  if (loadErr || !card) {
    return Response.json({ error: 'Card not found' }, { status: 404 })
  }

  let result
  try {
    result = rate(card, rating, new Date())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }

  const { error: updErr } = await supabase
    .from('cards')
    .update(result.fields)
    .eq('id', cardId)
  if (updErr) {
    return Response.json({ error: updErr.message }, { status: 500 })
  }

  // Best-effort review log (history / future FSRS tuning) — don't fail the
  // review if only the log insert errors.
  await supabase
    .from('review_logs')
    .insert({ card_id: cardId, user_id: user.id, ...result.log })

  return Response.json({ ok: true, due: result.fields.due, state: result.fields.state })
}
