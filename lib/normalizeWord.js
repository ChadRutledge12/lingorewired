// Collapses a Spanish word to a comparison key for duplicate detection:
// strips a leading article, common diminutive suffixes, and a trailing
// plural marker. Used both client-side (skip re-suggesting a word already in
// the session) and server-side (amplify dedup against a saved deck).
//
// Spanish pluralizes with "-s" after a vowel (mesa -> mesas) or "-es" after
// a consonant (pan -> panes) — matching "(es|s)$" (not just "s$") is what
// makes "pan" and "panes" collapse to the same key.
export function normalizeWord(word) {
  return (word || '')
    .toLowerCase()
    .trim()
    .replace(/^(el |la |los |las |un |una |unos |unas )/, '')
    .replace(/(illo|illa|illos|illas|ito|ita|itos|itas)$/, '')
    .replace(/(es|s)$/, '')
}
