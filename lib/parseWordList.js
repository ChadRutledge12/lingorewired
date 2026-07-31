// Turns a pasted vocabulary list into the items the enrich endpoint expects.
//
// Learners paste from wherever their words already live — a textbook margin, a
// tutor's email, a spreadsheet column, a phone note — so the input is never one
// tidy format. Rather than making them reformat, we accept the handful of
// shapes people actually paste and let the model sort out which side is
// Spanish (see `buildEnrichPrompt`), which means we never have to guess the
// column order here.

// Tried in order against each line; the FIRST match splits it, and only once,
// so "correr, to run, running" keeps everything after the first comma as the
// translation instead of silently dropping it.
//
// The spaced hyphen is deliberate — an unspaced one would cut compound entries
// in half. Tab comes first so a two-column spreadsheet paste wins even when the
// cells themselves contain commas or dashes.
const SEPARATORS = [
  /\t+/,
  / *[—–] */,
  / *\| */,
  / *; */,
  / +- +/,
  / *: */,
  / *, */,
]

// Numbered and bulleted lists paste with their markers attached; those are
// formatting, not vocabulary.
const LIST_MARKER = /^\s*(?:\d+\s*[.)]|[-*•·])\s+/

const MAX_FIELD = 120

function splitLine(line) {
  for (const sep of SEPARATORS) {
    const match = sep.exec(line)
    if (match) {
      return [line.slice(0, match.index), line.slice(match.index + match[0].length)]
    }
  }
  return [line]
}

// `text` is the raw textarea contents. Returns [{ word, translation }], where
// `translation` is '' when the learner gave only one side. Blank lines,
// duplicates, and stray list markers are dropped; nothing else is interpreted.
export function parseWordList(text) {
  const out = []
  const seen = new Set()

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(LIST_MARKER, '').trim()
    if (!line) continue

    const [first, second] = splitLine(line).map((part) => (part || '').trim().slice(0, MAX_FIELD))
    if (!first) continue

    // Case-insensitive so a list that repeats "Banco" and "banco" doesn't
    // spend two of the learner's limited slots on the same word.
    const key = `${first}|${second || ''}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    out.push({ word: first, translation: second || '' })
  }

  return out
}
