// Maps a card's FSRS scheduling state onto a human-readable 1–4 mastery
// scale, shared by the knowledge cloud and deck views. FSRS itself tracks
// far more nuance (stability in fractional days, difficulty, exact due
// dates) — this is deliberately a lossy, learner-facing simplification:
// "where does this word stand?" rather than "when is it due?".
//
// FSRS state: 0 New, 1 Learning, 2 Review, 3 Relearning.
// Stability ≈ days until recall probability drops to 90%.

const LEVELS = {
  1: {
    level: 1,
    label: 'New',
    // Words you haven't learned yet, or just forgot — they need attention,
    // but red would read as "you failed", so rose keeps it inviting.
    textClass: 'text-rose-500',
    badgeClass: 'bg-rose-50 text-rose-600 border-rose-200',
    dotClass: 'bg-rose-400',
  },
  2: {
    level: 2,
    label: 'Learning',
    textClass: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-400',
  },
  3: {
    level: 3,
    label: 'Familiar',
    textClass: 'text-primary',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    dotClass: 'bg-primary',
  },
  4: {
    level: 4,
    label: 'Mastered',
    textClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
}

// Stability thresholds (days) separating Learning / Familiar / Mastered for
// cards in Review state. A week of stability means it survived a few
// successful spaced recalls; a month means it's genuinely durable.
const FAMILIAR_STABILITY = 7
const MASTERED_STABILITY = 30

export function masteryOf(card) {
  const state = card.state ?? 0
  const stability = card.stability ?? 0
  if (state === 0 || state === 3) return LEVELS[1] // new, or forgotten (relearning)
  if (state === 1) return LEVELS[2] // in learning steps
  if (stability >= MASTERED_STABILITY) return LEVELS[4]
  if (stability >= FAMILIAR_STABILITY) return LEVELS[3]
  return LEVELS[2] // graduated but still young
}

export const MASTERY_LEVELS = [LEVELS[1], LEVELS[2], LEVELS[3], LEVELS[4]]
