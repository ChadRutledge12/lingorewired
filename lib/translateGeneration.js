// Prompt-building for Translation practice: turn a deck's vocabulary into
// English → Spanish production sentences. The learner produces the Spanish,
// then self-assesses against a model answer that also lists *other valid*
// translations (word order, ser/estar, tú/usted, synonyms) so a correct-but-
// different answer isn't mistaken for wrong.

import { registerGuidance } from './wordGeneration'

// `targets`: [{ id, word, translation, mastery }] — mastery is a 1–4 label
// used to calibrate difficulty (lean harder on well-known words).
export function buildTranslatePrompt(targets, { profile } = {}) {
  const level = profile?.level || 'intermediate'
  const register = registerGuidance(profile?.register)
  const wordList = targets
    .map((t) => `- ${t.word}${t.translation ? ` (${t.translation})` : ''}${t.mastery ? ` [${t.mastery}]` : ''}`)
    .join('\n')

  return `You are a Spanish teacher creating translation-practice sentences for a learner.

Learner level: ${level}
Target words (with the learner's mastery of each in brackets, 1 = new … 4 = mastered):
${wordList}
${register ? `\nREGISTER: ${register} Keep "es" and every "alternatives" entry consistently in this register — do not mix tú and usted across them.` : ''}

Write 6–9 English sentences for the learner to translate INTO Spanish. Together the sentences must use EVERY target word at least once (a sentence may use more than one). Calibrate difficulty to the learner's level: mostly simple, natural sentences, a little harder around words they already know well, gentler around new ones.

For EACH sentence provide:
- "en": the English sentence to translate.
- "es": the best natural Spanish translation.
- "alternatives": an array of 0–3 OTHER fully correct Spanish translations (different word order, ser vs estar, tú vs usted, natural synonyms). Empty array if there's really only one natural answer.
- "note": a short plain-English note on why the alternatives are also valid, OR a key thing to watch (ser/estar, gender, a tricky preposition). Keep it one sentence. Use "" if nothing worth noting.
- "targets": the target words actually used, each as { "surface": exact Spanish form as it appears in "es", "gloss": meaning in context }.
- "grammarHint": one short optional hint the learner could peek at before trying (e.g. "past tense — use the preterite"), or "".
- "scaffold": an array of { "es": word, "en": meaning } for any words in your Spanish answer that are NOT target words and that a learner at this level might not know yet — so they can peek without being blocked. Empty array if none.

Return ONLY this JSON, no markdown:
{ "sentences": [ { "en": "...", "es": "...", "alternatives": ["..."], "note": "...", "targets": [ { "surface": "...", "gloss": "..." } ], "grammarHint": "...", "scaffold": [ { "es": "...", "en": "..." } ] } ] }`
}
