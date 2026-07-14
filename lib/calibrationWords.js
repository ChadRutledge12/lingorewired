// Static placement instrument for known-word calibration. Shown once, right
// after the onboarding questionnaire (before the AI generates the set), so a
// learner's *self-reported* level can be checked against what they actually
// recognise. Deliberately a FIXED, dialect-neutral list — a placement test
// should be a consistent measuring stick, not a per-run AI generation.
//
// Curation rules for the bands: Spanish only (no translations — showing them
// would defeat the test), avoid free-guess English cognates (hospital, animal,
// familia), and avoid words that diverge sharply between Spain and Latin
// America. Each band should genuinely discriminate at its CEFR level.

export const CALIBRATION_BANDS = [
  { level: 'A1', words: ['agua', 'comer', 'ayer', 'poco', 'niño', 'siempre'] },
  { level: 'A2', words: ['temprano', 'barato', 'enfermo', 'dejar', 'cerca', 'llevar'] },
  { level: 'B1', words: ['aunque', 'lograr', 'apoyar', 'quejarse', 'sencillo', 'aprovechar'] },
  { level: 'B2', words: ['imprescindible', 'cotidiano', 'fomentar', 'acertar', 'ámbito', 'plantear'] },
  { level: 'C1', words: ['soslayar', 'atisbar', 'menospreciar', 'entrañable', 'inverosímil', 'aducir'] },
]

// Every calibration word, flat — handy for the component to render/shuffle.
export const ALL_CALIBRATION_WORDS = CALIBRATION_BANDS.flatMap((b) => b.words)

// The fraction of a band a learner must recognise for it to "count" as within
// their reach. 0.5 = knowing half the band's words.
const BAND_THRESHOLD = 0.5

// CEFR band → the app's self-report level vocabulary (LEVEL_OPTIONS in
// HomeClient). B2 and C1 both map to the top "B2+ — Comfortable" bucket, which
// is the ceiling the questionnaire offers.
const BAND_TO_LEVEL = {
  A1: 'A1 — I know a little',
  A2: 'A2 — Basic phrases',
  B1: 'B1 — Conversational',
  B2: 'B2+ — Comfortable',
  C1: 'B2+ — Comfortable',
}

// Given the words a learner tapped as "known", estimate their real level:
// walk bands easy→hard and take the HIGHEST band where they recognised at
// least BAND_THRESHOLD of the words. No qualifying band → complete beginner.
// Returns { level, band, knownWords } — `level` is a LEVEL_OPTIONS string,
// `band` is the raw CEFR band (or null).
export function estimateLevel(knownWords) {
  const known = new Set((knownWords || []).map((w) => w.toLowerCase().trim()))
  let highestBand = null
  for (const band of CALIBRATION_BANDS) {
    const hits = band.words.filter((w) => known.has(w.toLowerCase())).length
    if (hits / band.words.length >= BAND_THRESHOLD) highestBand = band.level
  }
  return {
    level: BAND_TO_LEVEL[highestBand] ?? 'Complete beginner',
    band: highestBand,
    knownWords: knownWords || [],
  }
}
