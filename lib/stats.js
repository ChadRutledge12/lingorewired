// Review-history stats: streaks, retention, and card-state breakdown.
// Pure functions — computed server-side in app/decks/page.js from
// `review_logs` and `cards` rows already scoped to the current user by RLS.

const STATE_LABELS = ['New', 'Learning', 'Review', 'Relearning']

// 'YYYY-MM-DD' for today (or `offsetDays` days before today), in UTC —
// shared by the review route (streak-freeze bookkeeping) and the reminder
// cron (who reviewed today, who's due for a freeze top-up).
export function utcDateStr(offsetDays = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - offsetDays)
  return d.toISOString().slice(0, 10)
}

// 'YYYY-MM-DD' for `date` in the given IANA time zone. Defaults to 'UTC',
// which reproduces the old toISOString().slice(0,10) behaviour exactly — so
// callers that don't pass a zone (e.g. the habit-loop cron) are unaffected.
export function dayStr(date, timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(date))
  const get = (t) => parts.find((p) => p.type === t).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Guard a client-supplied IANA zone (from the `tz` cookie) before handing it
// to Intl, which throws on an unknown zone. Falls back to 'UTC'.
export function resolveTimeZone(raw) {
  if (!raw) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw })
    return raw
  } catch {
    return 'UTC'
  }
}

// Consecutive-day streak, ending today (or "still alive" through today if
// the last review was yesterday — matches how Duolingo/Anki streaks behave,
// so reviewing once tonight doesn't reset a multi-day streak to zero at
// midnight). Days are bucketed in `timeZone` (an IANA zone) so the streak
// rolls over at the learner's local midnight; it defaults to 'UTC', which
// keeps the previous behaviour for callers that don't pass a zone.
//
// frozenDates: 'YYYY-MM-DD' strings auto-forgiven by a spent streak freeze
// (see profiles.frozen_dates) — treated the same as a real review day so a
// single missed day doesn't break the chain.
export function computeStreak(reviewTimestamps, frozenDates = [], timeZone = 'UTC') {
  const daySet = new Set(reviewTimestamps.map((t) => dayStr(t, timeZone)))
  for (const d of frozenDates) daySet.add(d)

  // Walk consecutive calendar days backward from today-in-`timeZone`. The
  // cursor is a bare calendar date parked at UTC midnight, so setUTCDate steps
  // whole days with no DST ambiguity and its ISO date part is the plain
  // 'YYYY-MM-DD' we compare against the (zone-bucketed) review days.
  const [y, m, d] = dayStr(new Date(), timeZone).split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  const cur = () => cursor.toISOString().slice(0, 10)

  let streak = 0
  if (!daySet.has(cur())) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  while (daySet.has(cur())) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// reviewLogs: [{ rating, review }], cards: [{ state }]
export function computeStats(reviewLogs, cards, frozenDates = [], timeZone = 'UTC') {
  const totalReviews = reviewLogs.length
  const todayStr = dayStr(new Date(), timeZone)
  const reviewsToday = reviewLogs.filter((r) => r.review && dayStr(r.review, timeZone) === todayStr).length

  // FSRS Rating enum: 1 Again, 2 Hard, 3 Good, 4 Easy — anything but Again
  // counts as a successful recall.
  const successCount = reviewLogs.filter((r) => r.rating > 1).length
  const retention = totalReviews > 0 ? Math.round((successCount / totalReviews) * 100) : null

  const streak = computeStreak(reviewLogs.map((r) => r.review), frozenDates, timeZone)

  const stateCounts = { New: 0, Learning: 0, Review: 0, Relearning: 0 }
  for (const c of cards) {
    stateCounts[STATE_LABELS[c.state] ?? 'New'] += 1
  }

  return { totalReviews, reviewsToday, retention, streak, stateCounts, totalCards: cards.length }
}
