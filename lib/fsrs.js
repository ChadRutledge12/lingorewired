// FSRS (Free Spaced Repetition Scheduler) wrapper.
// Server-side only — keep ts-fsrs out of client bundles.
//
// The rest of the app deals in plain "card fields" (JSON-serialisable, dates as
// ISO strings) that map 1:1 to columns on the `cards` table. This module
// converts to/from the ts-fsrs Card shape (which uses Date objects) and applies
// ratings. FSRS-6 defaults are used.

import { fsrs, createEmptyCard, Rating, State } from 'ts-fsrs'

const scheduler = fsrs()

// UI difficulty labels → ts-fsrs Rating enum.
export const RATINGS = ['again', 'hard', 'good', 'easy']
const RATING_ENUM = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const toISO = (d) => (d instanceof Date ? d.toISOString() : d ?? null)

// ts-fsrs Card (Date objects) → DB row fields (ISO strings / numbers).
function cardToFields(card) {
  return {
    due: toISO(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state,
    last_review: card.last_review ? toISO(card.last_review) : null,
  }
}

// DB row fields → ts-fsrs Card (Date objects).
function fieldsToCard(row) {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: row.learning_steps ?? 0,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

// Fresh scheduling fields for a brand-new card (state = New, due now).
export function newCardFields(now = new Date()) {
  return cardToFields(createEmptyCard(now))
}

// Apply a rating to a stored card. Returns the next scheduling fields plus a
// review-log row (append-only history, also useful for future FSRS optimisation).
export function rate(row, ratingLabel, now = new Date()) {
  const rating = RATING_ENUM[ratingLabel]
  if (rating === undefined) throw new Error(`Unknown rating: ${ratingLabel}`)
  const { card, log } = scheduler.next(fieldsToCard(row), now, rating)
  return {
    fields: cardToFields(card),
    log: {
      rating: log.rating,
      state: log.state,
      due: toISO(log.due),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      scheduled_days: log.scheduled_days,
      review: toISO(log.review),
    },
  }
}

// Human-readable interval each rating would produce, for labelling the review
// buttons (e.g. "10m" / "1d" / "4d" / "9d"). Does not mutate the card.
export function previewIntervals(row, now = new Date()) {
  const scheduling = scheduler.repeat(fieldsToCard(row), now)
  const out = {}
  for (const label of RATINGS) {
    out[label] = humanInterval(now, scheduling[RATING_ENUM[label]].card.due)
  }
  return out
}

export function humanInterval(from, to) {
  const mins = Math.round((new Date(to) - new Date(from)) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo`
  return `${(days / 365).toFixed(1)}y`
}

export { State, Rating }
