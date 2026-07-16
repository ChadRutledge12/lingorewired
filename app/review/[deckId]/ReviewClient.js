'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import SpeakButton from '@/components/SpeakButton'
import VoicePicker from '@/components/VoicePicker'
import VoiceDebugInfo from '@/components/VoiceDebugInfo'
import { useVoiceGender } from '@/lib/useVoiceGender'
import { useReviewMode } from '@/lib/useReviewMode'
import { speak } from '@/lib/speech'
import { buildCloze } from '@/lib/clozeBlank'
import { masteryOf } from '@/lib/mastery'
import { tierInfo } from '@/lib/tier'
import { LogoLink } from '@/components/Logo'

const RATING_BUTTONS = [
  { key: 'again', label: 'Again', classes: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' },
  { key: 'hard', label: 'Hard', classes: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { key: 'good', label: 'Good', classes: 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
  { key: 'easy', label: 'Easy', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
]

// Smart mode picks the exercise per card from its mastery: New/Learning stay
// on recognition (Flip) since production would be premature; Familiar moves
// to cued recall (Cloze when the word can be confidently blanked, else Type);
// Mastered demands full production (Type).
const SMART_LABELS = { flip: 'Recognize', cloze: 'Cued recall', type: 'Produce' }

function smartModeFor(card) {
  const level = masteryOf(card).level
  if (level <= 2) return 'flip'
  if (level === 3) return buildCloze(card.example, card.word) ? 'cloze' : 'type'
  return 'type'
}

function RatingButtons({ intervals, submitting, onRate }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATING_BUTTONS.map((b) => (
        <button
          key={b.key}
          type="button"
          disabled={submitting}
          onClick={() => onRate(b.key)}
          className={`flex flex-col items-center rounded-xl border py-2 text-sm font-medium transition disabled:opacity-50 ${b.classes}`}>
          {b.label}
          <span className="text-[11px] font-normal opacity-70">{intervals?.[b.key]}</span>
        </button>
      ))}
    </div>
  )
}

// Shows the session's ratings back to the learner — the whole point of
// tagging difficulty during review is that it schedules future practice,
// but that was previously invisible: the done screen said nothing about
// what just happened. This makes the consequence visible immediately.
function RatingTally({ log }) {
  if (log.length === 0) return null
  const counts = RATING_BUTTONS.map((b) => ({ ...b, count: log.filter((r) => r === b.key).length }))
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
      {counts.filter((c) => c.count > 0).map((c) => (
        <span key={c.key} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${c.classes}`}>
          {c.count} {c.label}
        </span>
      ))}
    </div>
  )
}

// Lenient comparison for typed answers: case/accent-insensitive, and forgives
// a missing leading article (e.g. typing "pan" for the stored word "el pan").
function normalizeForCompare(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^(el |la |los |las )/, '')
    .replace(/[.,!?\u00a1\u00bf]+$/, '')
}

export default function ReviewClient({ deckId, deckName, initialCards }) {
  const router = useRouter()
  const [cards] = useState(initialCards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // This session's ratings, in order — powers the RatingTally on the done
  // screen so difficulty-tagging has a visible payoff, not a silent one.
  const [ratingLog, setRatingLog] = useState([])
  const { gender: voiceGender, setGender: setVoiceGender } = useVoiceGender()
  const { mode, setMode } = useReviewMode()

  const [typedAnswer, setTypedAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)

  const current = cards[index]
  const done = index >= cards.length
  // In Smart mode the exercise is chosen per card from its mastery; otherwise
  // the learner's picked mode drives every card.
  const activeMode = mode === 'smart' && current ? smartModeFor(current) : mode
  const revealed = activeMode === 'flip' ? flipped : checked
  // null when the word can't be confidently located in the example sentence
  // (irregular conjugations mostly) — cloze mode falls back to a translation
  // prompt like Type mode in that case rather than guessing wrong.
  const cloze = activeMode === 'cloze' && current ? buildCloze(current.example, current.word) : null
  // What the typed answer is actually graded against — the blanked token for
  // cloze (may be a conjugated form, e.g. "como" not "comer"), the dictionary
  // word otherwise.
  const targetWord = cloze ? cloze.blank : current?.word
  // Adaptive difficulty: words you barely know get a first-letter + length
  // hint; Familiar/Mastered words get nothing — recall should stay hard
  // exactly when it's productive for it to be hard.
  const clozeHint = cloze && current && masteryOf(current).level <= 2
    ? `starts with “${cloze.blank[0]}” · ${cloze.blank.length} letters`
    : null

  const resetCardState = () => {
    setFlipped(false)
    setChecked(false)
    setTypedAnswer('')
    setIsCorrect(null)
  }

  const handleModeChange = (next) => {
    setMode(next)
    resetCardState()
  }

  const checkAnswer = () => {
    setIsCorrect(normalizeForCompare(typedAnswer) === normalizeForCompare(targetWord))
    setChecked(true)
  }

  const rateCard = useCallback(async (rating) => {
    if (submitting || !current) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: current.id, rating }),
      })
      if (res.status === 401) {
        router.push(`/login?next=${deckId ? `/review/${deckId}` : '/review'}`)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save review')
      setRatingLog((log) => [...log, rating])
      setFlipped(false)
      setChecked(false)
      setTypedAnswer('')
      setIsCorrect(null)
      setIndex((i) => i + 1)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [submitting, current, deckId, router])

  // Flips back through the SAME already-loaded set for another pass — no
  // network round-trip needed, and it works regardless of the due dates
  // that just got pushed out by rating. Without this, finishing a session
  // was a dead end: "Back to decks" was the only option.
  const reviewAgain = () => {
    setIndex(0)
    setRatingLog([])
    resetCardState()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (done) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (activeMode === 'flip') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setFlipped((f) => !f)
        } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
          rateCard(RATING_BUTTONS[Number(e.key) - 1].key)
        }
      } else if (checked && ['1', '2', '3', '4'].includes(e.key)) {
        rateCard(RATING_BUTTONS[Number(e.key) - 1].key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, flipped, checked, activeMode, rateCard])

  // Listening mode plays the word as soon as it's on screen, since there's
  // no text to look at yet — synchronizing audio playback with which card is
  // showing, not a state update, so this is a legitimate effect.
  useEffect(() => {
    if (activeMode === 'listen' && current && !checked) speak(current.word, voiceGender)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, current, checked])

  return (
    <div className="min-h-screen flex flex-col bg-muted/40 dark:bg-[#0f1442] p-4 sm:p-6">
      <LogoLink className="mb-4" />
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-slate-100 dark:bg-transparent text-slate-900 dark:text-white rounded-2xl dark:rounded-none shadow-sm dark:shadow-none ring-1 ring-slate-900/10 dark:ring-0 p-6 sm:p-8 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{deckName}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <VoicePicker gender={voiceGender} onChange={setVoiceGender} />
            <VoiceDebugInfo />
            <Link href="/decks" className="text-sm text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
              Exit
            </Link>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Review complete!</h2>
            <p className="text-sm text-slate-500 dark:text-white/60 mb-4">
              You reviewed {cards.length} card{cards.length === 1 ? '' : 's'}. Nicely done.
            </p>
            <RatingTally log={ratingLog} />
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <Button variant="outline" onClick={reviewAgain} className="flex-1 rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                Flip through again
              </Button>
              <Button asChild className="flex-1 rounded-xl">
                <Link href={deckId ? `/decks/${deckId}` : '/cloud'}>See updated mastery →</Link>
              </Button>
            </div>
            <Button asChild variant="ghost" className="w-full rounded-xl text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/10">
              <Link href="/decks">Back to decks</Link>
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={mode} onValueChange={handleModeChange} className="mb-4">
              <TabsList className="grid grid-cols-5 w-full dark:bg-white/10">
                <TabsTrigger value="smart" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Smart</TabsTrigger>
                <TabsTrigger value="flip" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Flip</TabsTrigger>
                <TabsTrigger value="type" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Type</TabsTrigger>
                <TabsTrigger value="listen" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Listen</TabsTrigger>
                <TabsTrigger value="cloze" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Cloze</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-4 flex items-center gap-2">
              <Progress value={(index / cards.length) * 100} className="flex-1 dark:bg-white/10" />
              {mode === 'smart' && (
                <span className="shrink-0 rounded-full bg-primary/10 dark:bg-white/15 px-2 py-0.5 text-[11px] font-medium text-primary dark:text-white">
                  {SMART_LABELS[activeMode]}
                </span>
              )}
            </div>

            {activeMode === 'flip' ? (
              <div key={current.id} className="flashcard-scene card-enter h-64 mb-4">
                <div
                  onClick={() => setFlipped((f) => !f)}
                  className={`flashcard relative w-full h-full cursor-pointer ${flipped ? 'is-flipped' : ''}`}>
                  <div className="flashcard-face absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-md p-6 flex flex-col items-center justify-center text-center">
                    {current.deckName && (
                      <span className="text-[11px] text-slate-500 mb-2">{current.deckName}</span>
                    )}
                    {current.tier && (
                      <Badge variant="outline" className={`mb-4 ${tierInfo(current.tier).badgeClass}`}>
                        {tierInfo(current.tier).label}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-2xl font-semibold text-slate-900">{current.word}</span>
                      <SpeakButton text={current.word} gender={voiceGender} />
                    </div>
                    <span className="text-sm text-slate-500 italic">{current.part_of_speech}</span>
                    <span className="text-xs text-slate-400 mt-6">Tap to reveal</span>
                  </div>
                  <div className="flashcard-face flashcard-face-back absolute inset-0 rounded-2xl border border-primary/20 bg-white shadow-md p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-semibold text-slate-900 mb-1">{current.translation}</span>
                    <span className="text-xs text-slate-500 italic mb-4">{current.part_of_speech}</span>
                    <div className="flex items-start gap-1">
                      <span className="text-sm text-slate-700 italic">{current.example}</span>
                      <SpeakButton text={current.example} gender={voiceGender} className="shrink-0 -mt-1" />
                    </div>
                    <span className="text-xs text-slate-500 italic mt-1">{current.example_translation}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={current.id} className="card-enter rounded-2xl border border-slate-200 bg-white shadow-md p-6 mb-4 text-center min-h-64 flex flex-col justify-center">
                {current.deckName && (
                  <span className="text-[11px] text-slate-500 mb-2">{current.deckName}</span>
                )}
                {current.tier && (
                  <Badge variant="outline" className={`mx-auto mb-4 ${tierInfo(current.tier).badgeClass}`}>
                    {tierInfo(current.tier).label}
                  </Badge>
                )}

                {activeMode === 'listen' ? (
                  <div className="flex flex-col items-center mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => speak(current.word, voiceGender)}
                      aria-label="Replay audio"
                      className="rounded-full size-14 mb-2">
                      <Volume2 className="size-6" />
                    </Button>
                    <span className="text-xs text-slate-500">Listen, then type what you heard</span>
                  </div>
                ) : activeMode === 'cloze' && cloze ? (
                  <>
                    <p className="text-base text-slate-900 mb-1">
                      {cloze.before}
                      <span className="inline-block min-w-16 border-b-2 border-primary/40 align-bottom">&nbsp;</span>
                      {cloze.after}
                    </p>
                    <span className={`text-xs text-slate-500 italic ${clozeHint ? 'mb-1' : 'mb-4'}`}>{current.example_translation}</span>
                    {clozeHint && <span className="text-xs text-primary/80 mb-4">{clozeHint}</span>}
                  </>
                ) : (
                  <>
                    <span className="text-xl font-semibold text-slate-900 mb-1">{current.translation}</span>
                    <span className="text-xs text-slate-500 italic mb-4">{current.part_of_speech}</span>
                  </>
                )}

                {!checked ? (
                  <form onSubmit={(e) => { e.preventDefault(); checkAnswer() }} className="flex gap-2">
                    <Input
                      autoFocus
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder={activeMode === 'listen' ? 'Type what you heard...' : activeMode === 'cloze' && cloze ? 'Fill in the blank...' : 'Type the Spanish word...'}
                      className="text-center rounded-xl bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    />
                    <Button type="submit" className="shrink-0 rounded-xl">Check</Button>
                  </form>
                ) : (
                  <div>
                    <div className={`flex items-center justify-center gap-1.5 mb-3 font-medium ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                      {isCorrect ? 'Correct!' : <>Correct answer: <span className="font-semibold">{targetWord}</span></>}
                    </div>
                    <div className="flex items-start justify-center gap-1">
                      <span className="text-sm text-slate-700 italic">{current.example}</span>
                      <SpeakButton text={current.example} gender={voiceGender} className="shrink-0 -mt-1" />
                    </div>
                    <span className="text-xs text-slate-500 italic mt-1">{current.example_translation}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {revealed ? (
              <RatingButtons intervals={current.intervals} submitting={submitting} onRate={rateCard} />
            ) : activeMode === 'flip' ? (
              <Button onClick={() => setFlipped(true)} className="w-full rounded-xl">
                Show answer
              </Button>
            ) : (
              <p className="text-center text-xs text-slate-500 dark:text-white/70 py-2">Type your answer and press Enter</p>
            )}

            <p className="mt-3 text-center text-xs text-slate-500 dark:text-white/70">
              {index + 1} / {cards.length}
              {activeMode === 'flip' && <span className="hidden sm:inline"> · space to flip · 1&ndash;4 to rate</span>}
              {activeMode !== 'flip' && checked && <span className="hidden sm:inline"> · 1&ndash;4 to rate</span>}
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
