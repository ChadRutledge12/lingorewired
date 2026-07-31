// Shared prompt-building + Claude-calling logic for generating Spanish
// vocabulary. Used by both the initial onboarding generator
// (/api/generate-words) and the "amplify deck" feature that extends an
// already-saved deck (/api/decks/[deckId]/amplify) — same underlying model
// call, different framing of what's already known.

import { notesGuidance } from './learningProfile'
import { normalizeWord } from './normalizeWord'

// The two conventions every generated card must follow, extracted so the
// enrichment prompt (which returns a different shape) can't drift from the
// generators' formatting.
const NOUN_ARTICLE_RULE = `For NOUNS, always include the definite article that matches gender and number ("el aeropuerto", "la reunión", "los guantes", "las llaves") so the gender is unambiguous. Do NOT add an article to non-nouns (verbs, adjectives, etc.).`
const PART_OF_SPEECH_RULE = `one of "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "article", "interjection", "numeral", "phrase", "other" (use "phrase" for multi-word expressions)`

export const WORD_FIELDS_SPEC =`- "word": the Spanish term. ${NOUN_ARTICLE_RULE}
- "translation": English meaning
- "part_of_speech": ${PART_OF_SPEECH_RULE}
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
  const notes = notesGuidance(profile.notes)
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
${notes ? `\n${notes}` : ''}
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
  const notes = profile ? notesGuidance(profile.notes) : ''
  return `You are a Spanish vocabulary expert and language teacher.

Create a starter Spanish vocabulary set for a deck titled "${title}".${topic ? ` Focus specifically on: ${topic}.` : ''}
${profile ? `About the learner — level: ${profile.level}; interests: ${(profile.interests || []).join(', ')}; daily contexts: ${(profile.contexts || []).join(', ')}; location: ${profile.location}.` : ''}
${register ? `\nREGISTER: ${register}` : ''}
${notes ? `\n${notes}` : ''}

Generate exactly ${count} Spanish words that form a coherent, genuinely useful set for this deck's theme — the words someone studying "${title}" would actually reach for.

Each word must have:
${WORD_FIELDS_SPEC}

${TIER_GUIDANCE}

Respond with ONLY the JSON array, no explanation, no markdown.`
}

export const ENRICH_MAX_SENSES = 3

// Turns vocabulary the learner brought in themselves (a textbook list, a class
// handout, a word typed into the manual add form) into complete flashcards.
//
// Unlike the generators above, we are NOT choosing the words — the learner
// already did. The job is only to fill in what's missing, which is why this
// returns candidate *senses* rather than a flat word list: "bank" is two
// unrelated Spanish words and picking one silently is how an import quietly
// teaches the wrong vocabulary.
//
// `items`: [{ given: ["bank"] }] or [{ given: ["correr", "to run"] }] — the
// one or two strings the learner typed, in whatever order. Which side is
// Spanish is the model's job to work out, since a paste of "to run — correr"
// and one of "correr — to run" are both completely normal.
export function buildEnrichPrompt(items, { profile, deckName, deckWords } = {}) {
  const dialect = profile ? dialectGuidance(profile.location) : ''
  const register = profile ? registerGuidance(profile.register) : ''
  const notes = profile ? notesGuidance(profile.notes) : ''
  const context = (deckWords || []).slice(0, 40).join(', ')

  const list = items
    .map((item, i) => `${i + 1}. ${item.given.map((g) => `"${g}"`).join(', ')}`)
    .join('\n')

  return `You are a Spanish teacher preparing flashcards from vocabulary a learner brought in themselves — a textbook list, a class handout, notes from a tutor. They chose these words already; your job is only to fill in what is missing, not to swap the words for better ones.

${profile ? `About the learner — level: ${profile.level}; interests: ${(profile.interests || []).join(', ')}; daily contexts: ${(profile.contexts || []).join(', ')}; location: ${profile.location}.` : ''}
${dialect ? `\nDIALECT: ${dialect}` : ''}
${register ? `\nREGISTER: ${register}` : ''}
${notes ? `\n${notes}` : ''}
${deckName ? `\nThese words are going into a deck called "${deckName}".` : ''}${context ? `\nThe deck already contains: ${context}` : ''}

Each item below is the one or two strings the learner typed. Work out for yourself which is Spanish and which is English — they may have written either one first.
- Only ONE string given: supply the missing side.
- BOTH strings given: the learner has already pinned the meaning. Keep their pairing. Correct the Spanish only where it is outright wrong — a missing article, a typo, a mangled inflection.

ITEMS:
${list}

For each item, return the candidate meanings as "senses", most likely first, at most ${ENRICH_MAX_SENSES}.

Set "ambiguous" to true ONLY when the word the learner gave maps to two or more genuinely DIFFERENT Spanish words with unrelated meanings, and they must pick. Otherwise false, with a single sense. Specifically:
- If BOTH strings were given, "ambiguous" is always false — their pairing already decided it.
- If the deck's name or its existing words clearly point at one meaning, just use that meaning and set "ambiguous" false. A deck about banking does not need to ask which "bank" was meant.
- Shades of the same meaning are not ambiguity. Reserve it for real forks like bank (money / river), right (correct / direction), or play (a game / an instrument).
- If a string is not a word in either language and you cannot interpret it, return an empty "senses" array for that item.

Each sense must have:
- "sense": a SHORT label saying WHICH meaning this is, e.g. "bank — where you keep money" or "bank — the side of a river". Write it in ENGLISH: the learner is often a beginner and cannot read a Spanish definition. Use "" when the item has only one sense.
- "word": the Spanish term. ${NOUN_ARTICLE_RULE}
- "translation": the English meaning
- "part_of_speech": ${PART_OF_SPEECH_RULE}
- "example": a natural sentence using the word in context, pitched at this learner's level
- "example_translation": the English translation of the example sentence

Return ONLY this JSON, no markdown:
{ "items": [ { "index": 1, "ambiguous": false, "senses": [ { "sense": "...", "word": "...", "translation": "...", "part_of_speech": "...", "example": "...", "example_translation": "..." } ] } ] }`
}

// Coerces one model-returned sense into a card-shaped object, dropping
// anything without a Spanish word. The model is reliable about this shape but
// the client feeds the result straight into a card insert, so a bad sense
// would become a broken card rather than a caught error.
export function sanitizeSense(raw) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const word = str(raw?.word)
  if (!word) return null
  return {
    sense: str(raw.sense),
    word,
    translation: str(raw.translation),
    part_of_speech: str(raw.part_of_speech),
    example: str(raw.example),
    example_translation: str(raw.example_translation),
  }
}

// Projects one chunk's model response back onto the items it was answering.
//
// `returned` is the raw "items" array from the model; `isDuplicate` reports
// whether a Spanish word is already in the deck. Returns the usable drafts
// plus the labels of any items nothing came back for, so the caller can tell
// the learner which words to retry instead of dropping them silently.
export function draftsFromChunk(chunk, returned, isDuplicate) {
  // Index back to the item each answer belongs to, rather than trusting the
  // response to arrive in order or to be complete.
  const byIndex = new Map()
  for (const item of Array.isArray(returned) ? returned : []) {
    const i = Number(item?.index)
    if (Number.isInteger(i) && i >= 1 && i <= chunk.length) byIndex.set(i, item)
  }

  const drafts = []
  const failed = []

  chunk.forEach((item, i) => {
    const answer = byIndex.get(i + 1)
    const senses = (Array.isArray(answer?.senses) ? answer.senses : [])
      .map(sanitizeSense)
      .filter(Boolean)
      .slice(0, ENRICH_MAX_SENSES)
      .map((sense) => ({ ...sense, duplicate: isDuplicate(sense.word) }))

    // Nothing usable came back — either the model couldn't interpret the
    // string or it skipped the item. Both are "you deal with this one", not
    // a silently dropped word.
    if (senses.length === 0) {
      failed.push(item.label)
      return
    }

    drafts.push({
      input: item.label,
      // A lone sense is nothing to choose between, whatever the model said.
      ambiguous: Boolean(answer?.ambiguous) && senses.length > 1,
      senses,
    })
  })

  return { drafts, failed }
}

// A long paste is truncated rather than rejected — a learner who dumps a
// six-page PDF still gets cards from the opening, which is more useful than an
// error telling them to trim it themselves.
export const EXTRACT_MAX_CHARS = 6000
export const EXTRACT_MAX_WORDS = 30

// Pulls the words worth learning out of an authentic text the learner brought
// — an official letter, a news article, a message from a landlord.
//
// The sibling of buildEnrichPrompt: that one takes a list the learner already
// made, this one makes the list for them. Both end at the same place, a
// complete card, which is why the response shape is deliberately compatible.
//
// What makes this worth more than plain generation: the example sentence is
// the learner's OWN sentence, lifted from the text. They meet the word again
// in the context where they first hit it.
export function buildExtractPrompt(text, { profile, deckName, deckWords, limit = EXTRACT_MAX_WORDS } = {}) {
  const dialect = profile ? dialectGuidance(profile.location) : ''
  const register = profile ? registerGuidance(profile.register) : ''
  const notes = profile ? notesGuidance(profile.notes) : ''
  const known = (deckWords || []).slice(0, 60).join(', ')

  return `You are a Spanish teacher. A learner has brought you a real text they need to understand — an official letter, an article, a message, something from their actual life. Pull out the vocabulary that is worth turning into flashcards for them.

${profile ? `About the learner — level: ${profile.level}; interests: ${(profile.interests || []).join(', ')}; daily contexts: ${(profile.contexts || []).join(', ')}; location: ${profile.location}.` : ''}
${dialect ? `\nDIALECT: ${dialect}` : ''}
${register ? `\nREGISTER: ${register}` : ''}
${notes ? `\n${notes}` : ''}
${deckName ? `\nThese cards are going into a deck called "${deckName}".` : ''}${known ? `\nThe learner already has these words — do NOT return them again: ${known}` : ''}

Choose at most ${limit} words, ordered most useful FIRST — for a beginner every word in a text like this may be new, so the order is what decides which ones they actually get. What to pick:
- Words this learner probably does NOT know yet, judged against their level. For a beginner that includes ordinary words a fluent reader would skip; for an advanced learner only the genuinely specialised ones.
- Words they will meet AGAIN — the vocabulary of this kind of document, not one-off curiosities.
- Multi-word expressions and set phrases when the phrase is the unit worth learning ("dar de alta", "a partir de"). Mark those "phrase".

What to leave out: proper nouns (people, companies, street names), numbers and dates, words the learner clearly already knows at their level, and anything already in their deck.

If the text is not in Spanish, or is too short or garbled to pull vocabulary from, return an empty "words" array.

For each word:
- "word": the Spanish term as a learner should study it — the DICTIONARY form, not whatever form the text happened to use: infinitive for verbs ("solicitar", not "solicitaron"), singular for nouns unless the word is normally plural. ${NOUN_ARTICLE_RULE}
- "translation": the English meaning IN THIS CONTEXT — the sense the text is using, not a list of every possible meaning
- "part_of_speech": ${PART_OF_SPEECH_RULE}
- "example": the sentence FROM THE TEXT where the word appears, copied exactly. If that sentence is longer than about 25 words, quote the clause that carries the word rather than the whole thing. Only if the text has no usable sentence for it, write a natural one at the learner's level.
- "example_translation": the English translation of that example

THE TEXT:
"""
${text}
"""

Also report "more": true if this text contains further words worth learning that you had to leave out to stay within ${limit}, false if you returned everything worth learning. Judge that against THIS learner's level — a beginner hits the limit on a text an advanced learner would find easy.

Return ONLY this JSON, no markdown:
{ "words": [ { "word": "...", "translation": "...", "part_of_speech": "...", "example": "...", "example_translation": "..." } ], "more": true }`
}

// Reshapes an extraction response into the same drafts the enrich flow
// produces, so both imports share one review UI. Extraction is never
// ambiguous: the source text already fixed which sense was meant.
export function draftsFromExtraction(returned, isDuplicate) {
  const seen = new Set()
  const drafts = []

  for (const raw of Array.isArray(returned) ? returned : []) {
    const sense = sanitizeSense(raw)
    if (!sense) continue
    // The model occasionally returns the same lemma twice when a text uses
    // two inflections of it ("solicitó" and "solicitando" → "solicitar").
    const key = normalizeWord(sense.word)
    if (seen.has(key)) continue
    seen.add(key)

    drafts.push({
      input: sense.word,
      ambiguous: false,
      senses: [{ ...sense, duplicate: isDuplicate(sense.word) }],
    })
  }

  return drafts
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
${notesGuidance(profile.notes) ? `\n${notesGuidance(profile.notes)}` : ''}

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

export { normalizeWord }
