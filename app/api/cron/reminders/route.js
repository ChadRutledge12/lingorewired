import { createAdminClient } from '@/lib/supabase/admin'
import { computeStreak, utcDateStr } from '@/lib/stats'
import { sendReminderEmail } from '@/lib/reminderEmail'

// Daily batch job, triggered by Vercel Cron (see vercel.json) with a
// `CRON_SECRET` bearer token. Emails anyone who hasn't reviewed yet today
// and still has cards due, and tops up a spent streak freeze for anyone
// whose streak just hit a 7-day multiple.
//
// Uses the service-role admin client — RLS doesn't apply, so every query
// below is explicitly scoped by user_id.
export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = utcDateStr(0)
  const nowIso = new Date().toISOString()

  // Candidates: opted in, have reviewed at least once ever, but not today.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('user_id, streak_freezes, frozen_dates, last_review_date, unsubscribe_token')
    .eq('reminders_enabled', true)
    .not('last_review_date', 'is', null)
    .neq('last_review_date', today)
  if (profilesErr) {
    return Response.json({ error: profilesErr.message }, { status: 500 })
  }
  if (!profiles || profiles.length === 0) {
    return Response.json({ sent: 0 })
  }

  const { data: userList, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (usersErr) {
    return Response.json({ error: usersErr.message }, { status: 500 })
  }
  const emailById = new Map(userList.users.map((u) => [u.id, u.email]))

  let sent = 0
  for (const profile of profiles) {
    const email = emailById.get(profile.user_id)
    if (!email) continue

    const { count: dueCount, error: dueErr } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
      .lte('due', nowIso)
    if (dueErr || !dueCount) continue // nothing due — no reminder needed

    const { data: logs } = await supabase
      .from('review_logs')
      .select('review')
      .eq('user_id', profile.user_id)
    const streak = computeStreak((logs || []).map((r) => r.review), profile.frozen_dates || [])

    // Freeze regeneration: earn one back every 7-day streak milestone.
    if (streak > 0 && streak % 7 === 0 && (profile.streak_freezes ?? 0) < 1) {
      await supabase.from('profiles').update({ streak_freezes: 1 }).eq('user_id', profile.user_id)
    }

    const ok = await sendReminderEmail({
      to: email,
      streak,
      dueCount,
      unsubscribeToken: profile.unsubscribe_token,
    })
    if (ok) sent += 1
  }

  return Response.json({ sent })
}
