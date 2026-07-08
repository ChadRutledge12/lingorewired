// Review-history stats: streaks, retention, and card-state breakdown.
// Pure functions — computed server-side in app/decks/page.js from
// `review_logs` and `cards` rows already scoped to the current user by RLS.

const STATE_LABELS = ['New', 'Learning', 'Review', 'Relearning']

// Consecutive-day streak, ending today (or "still alive" through today if
// the last review was yesterday — matches how Duolingo/Anki streaks behave,
// so reviewing once tonight doesn't reset a multi-day streak to zero at
// midnight). Computed in UTC calendar days as a reasonable approximation
// (exact local-midnight boundaries would need a stored timezone per user).
export function computeStreak(reviewTimestamps) {
  const daySet = new Set(reviewTimestamps.map((t) => new Date(t).toISOString().slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)

  if (!daySet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// reviewLogs: [{ rating, review }], cards: [{ state }]
export function computeStats(reviewLogs, cards) {
  const totalReviews = reviewLogs.length
  const todayStr = new Date().toISOString().slice(0, 10)
  const reviewsToday = reviewLogs.filter((r) => r.review?.slice(0, 10) === todayStr).length

  // FSRS Rating enum: 1 Again, 2 Hard, 3 Good, 4 Easy — anything but Again
  // counts as a successful recall.
  const successCount = reviewLogs.filter((r) => r.rating > 1).length
  const retention = totalReviews > 0 ? Math.round((successCount / totalReviews) * 100) : null

  const streak = computeStreak(reviewLogs.map((r) => r.review))

  const stateCounts = { New: 0, Learning: 0, Review: 0, Relearning: 0 }
  for (const c of cards) {
    stateCounts[STATE_LABELS[c.state] ?? 'New'] += 1
  }

  return { totalReviews, reviewsToday, retention, streak, stateCounts, totalCards: cards.length }
}
