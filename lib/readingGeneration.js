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

// Choose which deck words go into a reading: due cards first (ties the
// reading into the review schedule), then fill from the rest, capped so the
// story stays natural. Stable order within each group keeps results sane.
export function pickReadingTargets(cards, nowIso, cap = 12) {
  const withText = (cards || []).filter((c) => c.word)
  const due = withText.filter((c) => c.due && c.due <= nowIso)
  const notDue = withText.filter((c) => !(c.due && c.due <= nowIso))
  return [...due, ...notDue].slice(0, cap).map((c) => ({ id: c.id, word: c.word, translation: c.translation }))
}
