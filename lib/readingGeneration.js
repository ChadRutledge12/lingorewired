// Prompt-building for turning a deck's vocabulary into a short reading that
// uses the words in one coherent context — the "make a story from these
// words" move language teachers use, generated on demand.

// Length presets → rough sentence targets given to the model.
export const READING_LENGTHS = {
  short: { label: 'Short', sentences: '6–8' },
  medium: { label: 'Medium', sentences: '12–15' },
}

// `targets`: [{ word, translation }] already narrowed to a natural subset.
// `profile`: the deck's stored onboarding answers (may be null).
// `previousText`: when continuing an existing story, the Spanish so far — the
// model extends it rather than starting fresh.
// Returns a prompt asking for a strict JSON reading payload.
export function buildReadingPrompt(targets, { profile, scenario, length = 'short', previousText } = {}) {
  const preset = READING_LENGTHS[length] || READING_LENGTHS.short
  const level = profile?.level || 'intermediate'
  const wordList = targets.map((t) => `- ${t.word}${t.translation ? ` (${t.translation})` : ''}`).join('\n')

  const task = previousText
    ? `Continue this Spanish story naturally with ${preset.sentences} more sentences — pick up where it leaves off, keep the same characters, tense, and tone, and bring it toward a satisfying next beat. Do NOT repeat earlier sentences.

Story so far:
"""
${previousText}
"""

Weave in as many of these target words as read naturally (don't force any that hurt the flow):`
    : `Write a single coherent, natural short story in Spanish (${preset.sentences} sentences) that weaves in as many of these target words as read naturally — do not force every one if it hurts the flow:`

  return `You are a Spanish teacher writing a reading for a learner.

Learner level: ${level}
${scenario ? `The learner asked for this scenario/context: ${scenario}\n` : ''}
${task}
${wordList}

Requirements:
- Pitch the difficulty at the learner's level: mostly familiar words plus the targets, so it reads smoothly rather than feeling like a vocabulary drill.
- The story must make sense as one continuous piece with a beginning and end.
- For every target word you actually use, record the exact surface form as it appears in the sentence (including any article or conjugation, e.g. "comí", "las cebollas") and a short gloss of its meaning IN THAT CONTEXT (not just the dictionary definition).

Return ONLY this JSON, no markdown:
{
  "title": "a short Spanish title",
  "sentences": [
    {
      "es": "the Spanish sentence",
      "en": "a natural English translation of that sentence",
      "targets": [ { "surface": "exact form in this sentence", "gloss": "meaning in context" } ]
    }
  ]
}
Every sentence needs "es" and "en". "targets" is an array (empty [] if that sentence uses no target words).`
}

// How many comprehension questions a reading gets, scaled to its length —
// roughly one question per two sentences, bounded so a short reading isn't
// over-quizzed and a long one doesn't turn into a slog.
export function questionCountFor(sentenceCount) {
  return Math.max(3, Math.min(8, Math.round(sentenceCount / 2)))
}

// Multiple-choice only (not open-ended) so grading is a plain index compare
// in the UI — no separate grading call needed, and it works identically for
// listening mode where there's no text to compare a typed answer against.
export function buildComprehensionPrompt(fullText, { level, count } = {}) {
  return `You are a Spanish teacher writing reading comprehension questions.

Learner level: ${level || 'intermediate'}

Passage:
"""
${fullText}
"""

Write ${count} multiple-choice comprehension questions in Spanish that test whether the learner followed what happened in the passage — not vocabulary trivia, but actual comprehension. Pitch the question wording and reasoning difficulty at the learner's level (simple, literal questions for a beginner; more inferential ones for an advanced learner).

Requirements:
- Each question has exactly 4 answer options, only one correct.
- Wrong options should be plausible (details that appear elsewhere in the passage, or easily confused with the right answer) — not silly throwaways.
- Spread questions across the whole passage rather than clustering on one part.

Return ONLY this JSON, no markdown:
{
  "questions": [
    {
      "question": "the question, in Spanish",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "one short sentence in Spanish explaining why, referencing the passage"
    }
  ]
}`
}

// Choose which deck words go into a reading: due cards first (ties the
// reading into the review schedule), then fill from the rest, capped so the
// story stays natural. Stable order within each group keeps results sane.
export function pickReadingTargets(cards, nowIso, cap = 12) {
  const withText = (cards || []).filter((c) => c.word)
  const due = withText.filter((c) => c.due && c.due <= nowIso)
  const notDue = withText.filter((c) => !(c.due && c.due <= nowIso))
  return [...due, ...notDue].slice(0, cap).map((c) => ({ id: c.id, word: c.word, translation: c.translation }))
}
