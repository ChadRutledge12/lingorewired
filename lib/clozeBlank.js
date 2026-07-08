import { normalizeWord } from './normalizeWord'

// Finds which token in an example sentence corresponds to the card's word,
// so review mode can blank it out. Exact matching fails often for verbs
// ("comer" as the word vs. "como"/"comes" conjugated in the example), so this
// falls back to a normalized-prefix match — same idea as normalizeWord's
// suffix stripping, just comparing word stems instead of exact strings.
export function findClozeToken(example, word) {
  if (!example || !word) return -1
  const tokens = example.split(/(\s+)/) // keep whitespace so we can rejoin exactly
  const target = normalizeWord(word)
  if (!target) return -1

  const stripPunct = (s) => s.replace(/^[¿¡"'.,!?]+|[¿¡"'.,!?]+$/g, '')

  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i])) continue
    const clean = stripPunct(tokens[i])
    const normalized = normalizeWord(clean)
    if (!normalized) continue
    if (normalized === target) return i
  }

  // No exact stem match — try a loose prefix match (handles conjugated verbs
  // sharing a stem, e.g. "com" for "comer"/"como"/"comes"). Infinitives get
  // their "-ar"/"-er"/"-ir" ending dropped first so the stem lines up with
  // regular conjugations; stem-changing/irregular verbs (jugar -> juega,
  // entender -> entiendo) still won't match, which is fine — buildCloze
  // returns null and the caller falls back to a different mode.
  const stem = /[aei]r$/.test(target) ? target.slice(0, -2) : target.slice(0, Math.min(4, target.length))
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i])) continue
    const clean = stripPunct(tokens[i])
    const normalized = normalizeWord(clean)
    if (normalized && stem.length >= 3 && (normalized.startsWith(stem) || stem.startsWith(normalized))) {
      return i
    }
  }

  return -1
}

// Returns { before, blank, after } strings to render around a blank, or null
// if no confident match was found (caller should fall back to another mode).
export function buildCloze(example, word) {
  const tokens = example.split(/(\s+)/)
  const index = findClozeToken(example, word)
  if (index === -1) return null
  return {
    before: tokens.slice(0, index).join(''),
    blank: tokens[index],
    after: tokens.slice(index + 1).join(''),
  }
}
