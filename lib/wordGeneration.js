// Shared prompt-building + Claude-calling logic for generating Spanish
// vocabulary. Used by both the initial onboarding generator
// (/api/generate-words) and the "amplify deck" feature that extends an
// already-saved deck (/api/decks/[deckId]/amplify) — same underlying model
// call, different framing of what's already known.

export const WORD_FIELDS_SPEC = `- "word": the Spanish term
- "translation": English meaning
- "part_of_speech": one of "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "article", "interjection", "numeral", "phrase", "other" (use "phrase" for multi-word expressions)
- "example": a natural sentence using the word in context
- "example_translation": the English translation of the example sentence
- "tier": one of "universal", "environment", or "domain"`

// Full context prompt — used whenever we have the learner's onboarding
// answers (either live, during initial generation, or loaded from a saved
// deck's stored profile).
export function buildProfilePrompt(profile, count, existingWords) {
  return `You are a Spanish vocabulary expert and language teacher.

Generate a personalised vocabulary set for this learner:
- Level: ${profile.level}
- Native language: ${profile.nativeLanguage}
- Goals: ${(profile.goals || []).join(', ')}
- Interests: ${(profile.interests || []).join(', ')}
- Daily contexts: ${(profile.contexts || []).join(', ')}
- Location / variant: ${profile.location}
${existingWords ? `\nThey already know these words — do not repeat them: ${existingWords}` : ''}

Return exactly ${count} words as a JSON array. Each word must have:
${WORD_FIELDS_SPEC}

Split as: ${count <= 6 ? '2 universal, 2 environment, 2 domain' : '4 universal high-frequency, 4 environment/context, 4 domain/interest'}.
Respond with ONLY the JSON array, no explanation, no markdown.`
}

// Fallback for decks saved before the profile column existed — no
// level/goals/interests to work with, so lean entirely on the existing word
// list to infer theme and difficulty. `topic`, when given, steers generation
// toward a specific chosen topic instead of a generic extension (used when
// picking a suggested next topic on the deck detail page).
export function buildWordsOnlyPrompt(existingWords, count, topic) {
  return `You are a Spanish vocabulary expert and language teacher.

A student has this existing Spanish vocabulary set: ${existingWords}
${topic ? `\nFocus specifically on this topic: ${topic}` : ''}

Generate ${count} more Spanish words that ${topic ? 'relate to that topic and' : 'logically extend this set —'} similar difficulty level, and words that would naturally come up alongside what they already know. Do not repeat any of the existing words.

Return exactly ${count} words as a JSON array. Each word must have:
${WORD_FIELDS_SPEC}

Respond with ONLY the JSON array, no explanation, no markdown.`
}

// Suggests follow-up topics rather than words directly — same idea as
// buildProfilePrompt/buildWordsOnlyPrompt's split, but for the "what should
// this learner explore next" prompt shown as clickable suggestion chips.
export function buildTopicSuggestionsPrompt(profile, currentWords) {
  return `You are an expert Spanish language teacher.

A student has just learned these Spanish words: ${currentWords}

Their profile:
- Level: ${profile.level}
- Goals: ${(profile.goals || []).join(', ')}
- Interests: ${(profile.interests || []).join(', ')}
- Contexts: ${(profile.contexts || []).join(', ')}
- Location: ${profile.location}

Based on their current word set and profile, suggest 4 natural follow-up vocabulary topics they should explore next. Think like a teacher — what gaps do you notice? What would logically complement what they've learned?

Return ONLY a JSON array with this structure:
[
  { "topic": "Emergency phrases", "reason": "essential for safety on the Camino" },
  { "topic": "Weather vocabulary", "reason": "useful for outdoor activities" }
]

No explanation, no markdown, just the JSON array.`
}

// Fallback for profile-less decks — same idea as buildWordsOnlyPrompt.
export function buildWordsOnlyTopicSuggestionsPrompt(currentWords) {
  return `You are an expert Spanish language teacher.

A student has this existing Spanish vocabulary set: ${currentWords}

Suggest 4 natural follow-up vocabulary topics they should explore next, based on what would logically complement or extend this set.

Return ONLY a JSON array with this structure:
[
  { "topic": "Emergency phrases", "reason": "commonly needed alongside travel vocabulary" }
]

No explanation, no markdown, just the JSON array.`
}

// Calls Claude and returns the parsed word array. Throws an Error with a
// `.status` property on failure, so callers can forward the right HTTP
// status without duplicating the try/catch shape.
export async function callClaudeForWords(prompt, maxTokens = 1800) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const err = new Error(data.error?.message || 'Failed to generate words')
    err.status = response.status
    throw err
  }

  try {
    const text = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const err = new Error('Failed to parse generated words')
    err.status = 502
    throw err
  }
}

// Like callClaudeForWords but returns whatever JSON shape the prompt asks
// for (object or array) — used by features whose payload isn't a word list,
// e.g. reading generation. Same Error-with-.status contract.
export async function callClaudeForJson(prompt, maxTokens = 2000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const err = new Error(data.error?.message || 'Failed to generate')
    err.status = response.status
    throw err
  }

  try {
    const text = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const err = new Error('Failed to parse response')
    err.status = 502
    throw err
  }
}

export { normalizeWord } from './normalizeWord'
