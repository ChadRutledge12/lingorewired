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
- "tier": one of "personal" or "essential"`

// How the three tiers should relate to the learner — the key is that even
// "universal" words are chosen to serve THIS learner's world, not pulled
// from a generic frequency list (which is why every deck used to get the
// same handful of universal words).
const TIER_GUIDANCE = `Two tiers:
- "personal": words tied to THIS learner's own life — their interests, hobbies, profession, daily situations/places, relationships, routines, and goals. This is the heart of the set; draw on both the everyday situations they're in AND their specific niche/professional world.
- "essential": high-frequency foundational words — but pick ones the learner would actually reach for while talking about their personal vocabulary above (the verbs, connectors, question words, and descriptors that glue their specific words into real sentences), NOT a generic textbook frequency list.
Every word should feel like it belongs to the same coherent world as the others — a set they could use together in one conversation.`

// Turns the learner's chosen location into an explicit dialect instruction,
// so a learner who asked for Spain gets Castilian lexis/grammar and a learner
// who asked for a Latin American country gets that variety — instead of a
// generic default they may not trust.
export function dialectGuidance(location) {
  const loc = (location || '').toLowerCase()
  if (loc.includes('spain')) {
    return 'Use PENINSULAR (Castilian) Spanish: Spain vocabulary (e.g. coche, móvil, zumo, patata, ordenador, vale), and the vosotros form where a plural "you" is natural. Avoid Latin-American-only words.'
  }
  if (loc.includes('mexico') || loc.includes('méxico')) {
    return 'Use MEXICAN Spanish vocabulary and register; avoid Peninsular-only words (no vosotros).'
  }
  if (loc.includes('argentina')) {
    return 'Use RIOPLATENSE (Argentine) Spanish: voseo (vos/tenés) and local vocabulary; no vosotros.'
  }
  if (loc.includes('colombia')) {
    return 'Use COLOMBIAN Spanish vocabulary and register; no vosotros.'
  }
  if (loc.includes('latin')) {
    return 'Use neutral LATIN AMERICAN Spanish (ustedes, not vosotros); avoid Peninsular-only words like vale/zumo/ordenador.'
  }
  return ''
}

// Turns the learner's chosen formality into an explicit register instruction
// — same idea as dialectGuidance, but for tú vs usted rather than regional
// vocabulary. Unset (empty string) leaves generation exactly as it was
// before this existed.
export function registerGuidance(register) {
  const r = (register || '').toLowerCase()
  if (r.includes('informal')) {
    return 'Use INFORMAL register throughout: tú (not usted) for "you", everyday conversational tone.'
  }
  if (r.includes('formal')) {
    return 'Use FORMAL register throughout: usted (not tú) for "you", vocabulary and example sentences suited to professional, official, or polite contexts.'
  }
  return ''
}

// Full context prompt — used whenever we have the learner's onboarding
// answers (either live, during initial generation, or loaded from a saved
// deck's stored profile).
export function buildProfilePrompt(profile, count, existingWords) {
  const dialect = dialectGuidance(profile.location)
  const register = registerGuidance(profile.register)
  return `You are a Spanish vocabulary expert and language teacher.

Generate a personalised vocabulary set for this learner:
- Level: ${profile.level}
- Native language: ${profile.nativeLanguage}
- Goals: ${(profile.goals || []).join(', ')}
- Interests: ${(profile.interests || []).join(', ')}
- Daily contexts: ${(profile.contexts || []).join(', ')}
- Location / variant: ${profile.location}
${dialect ? `\nDIALECT: ${dialect}` : ''}
${register ? `\nREGISTER: ${register}` : ''}
${existingWords ? `\nThey already know these words — do not repeat them, but DO choose words that connect to and extend this existing set: ${existingWords}` : ''}

Return exactly ${count} words as a JSON array. Each word must have:
${WORD_FIELDS_SPEC}

${TIER_GUIDANCE}

Weight the set toward personal words (roughly 60% personal, 40% essential — e.g. ${count <= 6 ? '4 personal, 2 essential' : '7 personal, 5 essential'}), since personalization is the point.
Vary your choices — do not default to the same common essential words every time; tailor them to this learner.
Respond with ONLY the JSON array, no explanation, no markdown.`
}

// Starter words for an empty deck, seeded by the deck's title (e.g. a manual
// deck the learner named "Business and Finance"). Optional topic narrows it.
export function buildTitleWordsPrompt(title, count, { profile, topic } = {}) {
  const register = profile ? registerGuidance(profile.register) : ''
  return `You are a Spanish vocabulary expert and language teacher.

Create a starter Spanish vocabulary set for a deck titled "${title}".${topic ? ` Focus specifically on: ${topic}.` : ''}
${profile ? `About the learner — level: ${profile.level}; interests: ${(profile.interests || []).join(', ')}; daily contexts: ${(profile.contexts || []).join(', ')}; location: ${profile.location}.` : ''}
${register ? `\nREGISTER: ${register}` : ''}

Generate exactly ${count} Spanish words that form a coherent, genuinely useful set for this deck's theme — the words someone studying "${title}" would actually reach for.

Each word must have:
${WORD_FIELDS_SPEC}

${TIER_GUIDANCE}

Respond with ONLY the JSON array, no explanation, no markdown.`
}

// Sub-topics within a deck's title, so an empty deck can offer angles to
// focus its starter words on.
export function buildTitleTopicSuggestionsPrompt(title, profile) {
  return `You are an expert Spanish language teacher.

A student is starting a new Spanish vocabulary deck titled "${title}".${profile ? ` They are ${profile.level}${(profile.interests || []).length ? `, interested in ${profile.interests.join(', ')}` : ''}.` : ''}

Suggest 4 specific sub-topics within "${title}" they could focus their first vocabulary on. Each must be a concrete angle, not a restatement of the whole theme.

Return ONLY a JSON array: [ { "topic": "...", "reason": "..." } ]
No explanation, no markdown.`
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

IMPORTANT: Each topic must open a genuinely NEW area. Do NOT suggest topics that restate, overlap with, or centre on words they already have listed above — they are already studying those.

Return ONLY a JSON array with this structure:
[
  { "topic": "Emergency phrases", "reason": "essential for safety on the Camino" },
  { "topic": "Weather vocabulary", "reason": "useful for outdoor activities" }
]

No explanation, no markdown, just the JSON array.`
}

// Deterministic backstop for the topic-suggestion prompts: LLMs are unreliable
// at "don't repeat what they have," so drop any suggestion whose topic text
// contains a word the learner already studies. `existingWords` is the raw
// comma-joined or array list of their current words.
export function dedupeSuggestions(suggestions, existingWords) {
  const list = Array.isArray(existingWords)
    ? existingWords
    : String(existingWords || '').split(',')
  const stems = list
    .map((w) => w.toLowerCase().trim().replace(/^(el |la |los |las |un |una |unos |unas )/, ''))
    .filter((w) => w.length > 2)
  return (suggestions || []).filter((s) => {
    const topic = (s?.topic || '').toLowerCase()
    return !stems.some((stem) => topic.includes(stem))
  })
}

// Fallback for profile-less decks — same idea as buildWordsOnlyPrompt.
export function buildWordsOnlyTopicSuggestionsPrompt(currentWords) {
  return `You are an expert Spanish language teacher.

A student has this existing Spanish vocabulary set: ${currentWords}

Suggest 4 natural follow-up vocabulary topics they should explore next, based on what would logically complement or extend this set.

IMPORTANT: Each topic must open a genuinely NEW area. Do NOT suggest topics that restate, overlap with, or centre on words they already have listed above.

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
