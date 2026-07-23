// The learner's profile — level, native language, goals, interests, contexts,
// location, register, plus a freeform note. This module is the single source
// of truth for the option vocabulary and the profile shape; the onboarding
// questionnaire (app/HomeClient.js) and the settings page (app/settings) both
// read from here so they can never drift apart.
//
// Storage: the canonical copy lives on profiles.learning_profile (one row per
// user). Each deck still snapshots the profile into decks.profile at creation
// time, so an old deck stays reproducible — "what was I when I made this?" —
// while new generation always reads the live canonical profile.

export const LEVEL_OPTIONS = ['Complete beginner', 'A1 — I know a little', 'A2 — Basic phrases', 'B1 — Conversational', 'B2+ — Comfortable']
export const LANGUAGE_OPTIONS = ['English', 'French', 'Italian', 'Portuguese', 'German', 'Other']
export const GOAL_OPTIONS = ['Travel & get around', 'Work & business', 'Connect with locals', 'Living abroad', 'Academic study', 'Hobby / curiosity']
export const INTEREST_OPTIONS = ['Sport & fitness', 'Food & cooking', 'Music', 'Business & finance', 'Nature & outdoors', 'Tech', 'Art & culture', 'Health', 'Scuba diving', 'Law']
export const CONTEXT_OPTIONS = ['Restaurants & cafes', 'Meetings & offices', 'Outdoors & activities', 'Hotels & travel', 'Shops & markets', 'Social situations', 'Emergencies', 'Medical settings']
export const LOCATION_OPTIONS = ['Spain', 'Mexico', 'Argentina', 'Colombia', 'Latin America (general)', 'Not sure yet']
export const REGISTER_OPTIONS = ['Informal — tú', 'Formal — usted']

// Beginners won't know tú from usted, so the chips get explained on hover.
export const REGISTER_DESCRIPTIONS = {
  'Informal — tú': 'tú is the casual "you" — for friends, family, and people your own age.',
  'Formal — usted': 'usted is the polite "you" — for strangers, elders, and professional or official settings.',
}

// The multi-select fields, which accept custom entries alongside the presets
// and therefore need deduping on load.
export const MULTI_FIELDS = ['goals', 'interests', 'contexts']

export const NOTES_MAX = 1000

export const EMPTY_PROFILE = {
  level: '',
  nativeLanguage: '',
  goals: [],
  interests: [],
  contexts: [],
  location: '',
  register: '',
  // Freeform "what I want to learn" — injected verbatim into every generation
  // prompt, so the learner can steer the app in ways the chips can't express
  // ("I'm moving to Valencia in March, focus on rental and utility vocab").
  notes: '',
}

// Coerce anything we load — a legacy deck snapshot, a hand-edited row, an API
// body — into the full profile shape. Unknown keys are dropped, multi-selects
// are forced to deduped arrays of non-empty strings, and scalars to strings,
// so downstream prompt builders never have to defend themselves.
export function normalizeProfile(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const out = { ...EMPTY_PROFILE }

  for (const key of ['level', 'nativeLanguage', 'location', 'register']) {
    if (typeof input[key] === 'string') out[key] = input[key].trim()
  }
  for (const key of MULTI_FIELDS) {
    const values = Array.isArray(input[key]) ? input[key] : []
    out[key] = [...new Set(values.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()))]
  }
  if (typeof input.notes === 'string') out.notes = input.notes.trim().slice(0, NOTES_MAX)

  return out
}

// True once the learner has answered enough for generation to be meaningfully
// personalised — used to decide whether to send a returning learner to the
// summary or back through the questionnaire.
export function isProfileComplete(profile) {
  const p = normalizeProfile(profile)
  return Boolean(p.level && p.nativeLanguage && p.location)
}

// The learner's freeform note, turned into a prompt instruction. Kept as its
// own labelled block (rather than glued into the profile list) so the model
// treats it as a standing directive from the learner, and so it's obvious in
// logs where the free text ends.
export function notesGuidance(notes) {
  const text = (notes || '').trim()
  if (!text) return ''
  return `The learner also described what they want to learn, in their own words. Honour this — it outranks the checkbox answers above where they conflict:
"""
${text}
"""`
}
