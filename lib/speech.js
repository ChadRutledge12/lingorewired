// Spanish pronunciation via the browser's built-in Web Speech API.
// No backend, no API cost — this only runs client-side.
//
// Country/dialect selection was removed: most browsers only expose one
// Spanish voice total, so choosing es-ES vs es-419 silently fell back to the
// same voice with no audible difference. Voices *do* usually come in
// male/female pairs though, so that's the axis we let people pick instead.

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// getVoices() can return [] on first call — the list loads async and fires
// 'voiceschanged' once ready. Some browsers never fire it if voices were
// already cached, hence the timeout fallback.
function loadVoices() {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([])
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) return resolve(existing)
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
    }
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 250)
  })
}

function spanishVoices(voices) {
  return voices.filter((v) => v.lang?.toLowerCase().startsWith('es'))
}

// The Web Speech API doesn't expose voice gender directly, so this guesses
// from the voice's name — reasonably reliable across major desktop/mobile
// platforms, which mostly draw from the same small pool of named voices.
const FEMALE_NAME_HINTS = [
  'mónica', 'monica', 'paulina', 'sabina', 'helena', 'elvira', 'lucía', 'lucia',
  'laura', 'conchita', 'camila', 'lupe', 'marisol', 'soledad', 'francisca',
  'esperanza', 'isabela', 'valeria', 'pilar', 'carmen', 'maría', 'maria',
  'marina', 'rosa', 'victoria', 'ángela', 'angela', 'gabriela', 'daniela',
  'catalina', 'eef', 'female',
]
const MALE_NAME_HINTS = [
  'jorge', 'juan', 'diego', 'carlos', 'pablo', 'enrique', 'miguel', 'raúl',
  'raul', 'andrés', 'andres', 'fernando', 'alonso', 'antonio', 'javier',
  'alejandro', 'ricardo', 'francisco', 'emilio', 'rodrigo', 'ignacio', 'eae',
  'male',
]

function guessGender(voice) {
  const name = voice.name?.toLowerCase() || ''
  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) return 'female'
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) return 'male'
  return null
}

// Selectable voice genders for the pronunciation picker.
export const VOICE_GENDERS = [
  { value: 'female', label: 'Female voice' },
  { value: 'male', label: 'Male voice' },
]

// Quality ranking for candidate voices. Browsers expose several voices per
// gender with wildly different synthesis quality (a compact on-device voice
// vs. a neural cloud voice), and the raw getVoices() ordering is arbitrary —
// picking "first match" was why one gender could sound noticeably worse
// than the other on the same machine. Scoring every candidate and taking
// the best applies the same standard to both genders.
const QUALITY_BONUSES = [
  ['natural', 4], ['neural', 4], ['premium', 4], ['enhanced', 3], ['siri', 3],
  ['google', 2], ['online', 2],
]
const QUALITY_PENALTIES = [
  ['compact', 4], ['eloquence', 5], ['espeak', 5], ['novelty', 5], ['grandma', 5],
  ['grandpa', 5], ['shelley', 5], ['flo', 5],
]

function qualityScore(voice) {
  const name = voice.name?.toLowerCase() || ''
  let score = voice.localService ? 0 : 4 // network voices are usually best
  for (const [hint, points] of QUALITY_BONUSES) if (name.includes(hint)) score += points
  for (const [hint, points] of QUALITY_PENALTIES) if (name.includes(hint)) score -= points
  return score
}

function bestByQuality(candidates) {
  let best = null
  let bestScore = -Infinity
  for (const v of candidates) {
    const s = qualityScore(v)
    if (s > bestScore) { best = v; bestScore = s }
  }
  return best
}

// Prefer a voice we're confident matches the requested gender; among those,
// take the highest-quality one. If we can't confidently classify any voice
// as the requested gender, fall back to the best Spanish voice overall —
// and say so via `confident: false`, so the caller knows this wasn't a
// real match.
function pickVoice(voices, gender) {
  const spanish = spanishVoices(voices)
  const matching = spanish.filter((v) => guessGender(v) === gender)
  if (matching.length > 0) {
    return { voice: bestByQuality(matching), confident: true }
  }
  return { voice: bestByQuality(spanish), confident: false }
}

// Used when the browser has no voice we can confidently tell apart by
// gender — i.e. "male" and "female" would otherwise play the identical
// voice (common on devices with a single Spanish voice, which is what makes
// the toggle seem broken). The Web Speech API's pitch shift isn't
// formant-preserving, so pushing pitch *up* strains ("chipmunk") faster than
// pushing it *down* sounds merely deeper — so the shifts are asymmetric, but
// both are large enough to be *clearly* distinguishable when it's the same
// underlying voice. Male also reads slightly slower to reinforce the effect.
const FALLBACK_PITCH = { female: 1.15, male: 0.8 }
const FALLBACK_RATE = { female: 0.92, male: 0.86 }

// Diagnostic: what voices the browser actually reports, and exactly what
// each gender selection resolves to. Surfaced in a small UI panel so we can
// see real data instead of guessing at pitch values blind.
export async function debugVoiceReport() {
  const voices = await loadVoices()
  const spanish = spanishVoices(voices)
  const female = pickVoice(voices, 'female')
  const male = pickVoice(voices, 'male')
  return {
    totalVoices: voices.length,
    spanishVoices: spanish.map((v) => ({
      name: v.name,
      lang: v.lang,
      network: !v.localService,
      guessedGender: guessGender(v) || 'unknown',
      quality: qualityScore(v),
    })),
    selection: {
      female: {
        name: female.voice?.name || null,
        confident: female.confident,
        pitch: female.confident ? 1.0 : FALLBACK_PITCH.female,
      },
      male: {
        name: male.voice?.name || null,
        confident: male.confident,
        pitch: male.confident ? 1.0 : FALLBACK_PITCH.male,
      },
    },
  }
}

// `onEnd` (optional) fires once when playback finishes OR errors out, so
// callers building a play/pause UI (e.g. listening mode) don't get stuck
// showing "playing" forever if synthesis fails partway through.
export async function speak(text, gender = 'female', { onEnd } = {}) {
  if (!isSpeechSupported() || !text) { onEnd?.(); return }
  window.speechSynthesis.cancel() // stop anything already playing
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-ES'
  const { voice, confident } = pickVoice(await loadVoices(), gender)
  // A confident, genuinely gendered voice is left at natural pitch/rate.
  // Otherwise apply the asymmetric fallback so the two options still sound
  // clearly different rather than identical.
  utterance.pitch = confident ? 1.0 : (FALLBACK_PITCH[gender] ?? 1.0)
  utterance.rate = confident ? 0.9 : (FALLBACK_RATE[gender] ?? 0.9)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  window.speechSynthesis.speak(utterance)
}

// Stops whatever is currently playing — used by a listening-mode "stop"
// control to cut playback short without waiting for onend.
export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
