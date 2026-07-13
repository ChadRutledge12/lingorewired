// The two learner-facing vocabulary categories. New decks generate cards
// tagged 'personal' or 'essential'; older decks still carry the legacy
// three-tier values ('universal' | 'environment' | 'domain'). Everything the
// learner sees goes through here, so both schemes collapse to the same two
// clear buckets — no database migration needed.
//
// - Personal: words tied to the learner's own life (was environment + domain).
// - Essential: high-frequency foundational words (was universal).

const PERSONAL = {
  key: 'personal',
  label: 'Personal',
  badgeClass: 'bg-primary/10 text-primary border-primary/20',
  description: 'Words tied to your interests, work, routines, relationships, and goals.',
}

const ESSENTIAL = {
  key: 'essential',
  label: 'Essential',
  badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  description: 'High-frequency foundational words that glue your personal vocabulary into real sentences.',
}

export function tierInfo(tier) {
  switch ((tier || '').toLowerCase()) {
    case 'essential':
    case 'universal':
      return ESSENTIAL
    default: // 'personal' | 'environment' | 'domain' | anything unknown
      return PERSONAL
  }
}

export const TIERS = [PERSONAL, ESSENTIAL]
