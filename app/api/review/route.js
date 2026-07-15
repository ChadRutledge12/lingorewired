import { createClient } from '@/lib/supabase/server'
import { rate } from '@/lib/fsrs'
import { utcDateStr } from '@/lib/stats'

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

  // Best-effort streak-freeze bookkeeping: if exactly yesterday was missed
  // (today - 2 was the last active day) and a freeze is banked, spend it to
  // bridge the gap instead of letting the streak reset. Anything else (same
  // day repeat, normal consecutive day, or too big a gap) just bumps
  // last_review_date — computeStreak (lib/stats.js) reflects the rest.
  try {
    const today = utcDateStr(0)
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_goal, streak_freezes, frozen_dates, last_review_date')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile?.last_review_date !== today) {
      const yesterday = utcDateStr(1)
      const twoDaysAgo = utcDateStr(2)
      let streakFreezes = profile?.streak_freezes ?? 1
      let frozenDates = profile?.frozen_dates ?? []
      if (profile?.last_review_date === twoDaysAgo && streakFreezes > 0 && !frozenDates.includes(yesterday)) {
        streakFreezes -= 1
        frozenDates = [...frozenDates, yesterday]
      }
      await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          daily_goal: profile?.daily_goal ?? 20,
          streak_freezes: streakFreezes,
          frozen_dates: frozenDates,
          last_review_date: today,
        },
        { onConflict: 'user_id' }
      )
    }
  } catch {
    // Never fail a review over streak bookkeeping.
  }

  return Response.json({ ok: true, due: result.fields.due, state: result.fields.state })
}
