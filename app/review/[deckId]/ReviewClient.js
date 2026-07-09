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
import { LogoLink } from '@/components/Logo'

const TIER_CLASSES = {
  universal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  environment: 'bg-primary/10 text-primary border-primary/20',
  domain: 'bg-amber-50 text-amber-700 border-amber-200',
}

const RATING_BUTTONS = [
  { key: 'again', label: 'Again', classes: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' },
  { key: 'hard', label: 'Hard', classes: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { key: 'good', label: 'Good', classes: 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20' },
  { key: 'easy', label: 'Easy', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
]

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
  const { gender: voiceGender, setGender: setVoiceGender } = useVoiceGender()
  const { mode, setMode } = useReviewMode()

  const [typedAnswer, setTypedAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)

  const current = cards[index]
  const done = index >= cards.length
  const revealed = mode === 'flip' ? flipped : checked
  // null when the word can't be confidently located in the example sentence
  // (irregular conjugations mostly) — cloze mode falls back to a translation
  // prompt like Type mode in that case rather than guessing wrong.
  const cloze = mode === 'cloze' && current ? buildCloze(current.example, current.word) : null
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

  useEffect(() => {
    const onKey = (e) => {
      if (done) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (mode === 'flip') {
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
  }, [done, flipped, checked, mode, rateCard])

  // Listening mode plays the word as soon as it's on screen, since there's
  // no text to look at yet — synchronizing audio playback with which card is
  // showing, not a state update, so this is a legitimate effect.
  useEffect(() => {
    if (mode === 'listen' && current && !checked) speak(current.word, voiceGender)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current, checked])

  return (
    <div className="min-h-screen flex flex-col bg-muted/40 p-4 sm:p-6">
      <LogoLink className="mb-4" />
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-6 sm:p-8 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground truncate">{deckName}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <VoicePicker gender={voiceGender} onChange={setVoiceGender} />
            <VoiceDebugInfo />
            <Link href="/decks" className="text-sm text-muted-foreground hover:text-foreground">
              Exit
            </Link>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Review complete!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You reviewed {cards.length} card{cards.length === 1 ? '' : 's'}. Nicely done.
            </p>
            <Button asChild className="w-full rounded-xl">
              <Link href="/decks">Back to decks</Link>
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={mode} onValueChange={handleModeChange} className="mb-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="flip">Flip</TabsTrigger>
                <TabsTrigger value="type">Type</TabsTrigger>
                <TabsTrigger value="listen">Listen</TabsTrigger>
                <TabsTrigger value="cloze">Cloze</TabsTrigger>
              </TabsList>
            </Tabs>

            <Progress value={(index / cards.length) * 100} className="mb-4" />

            {mode === 'flip' ? (
              <div key={current.id} className="flashcard-scene card-enter h-64 mb-4">
                <div
                  onClick={() => setFlipped((f) => !f)}
                  className={`flashcard relative w-full h-full cursor-pointer ${flipped ? 'is-flipped' : ''}`}>
                  <div className="flashcard-face absolute inset-0 rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col items-center justify-center text-center">
                    {current.deckName && (
                      <span className="text-[11px] text-muted-foreground mb-2">{current.deckName}</span>
                    )}
                    {current.tier && (
                      <Badge variant="outline" className={`mb-4 ${TIER_CLASSES[current.tier] || ''}`}>
                        {current.tier}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-2xl font-semibold text-foreground">{current.word}</span>
                      <SpeakButton text={current.word} gender={voiceGender} />
                    </div>
                    <span className="text-sm text-muted-foreground italic">{current.part_of_speech}</span>
                    <span className="text-xs text-muted-foreground/70 mt-6">Tap to reveal</span>
                  </div>
                  <div className="flashcard-face flashcard-face-back absolute inset-0 rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-semibold text-foreground mb-1">{current.translation}</span>
                    <span className="text-xs text-muted-foreground italic mb-4">{current.part_of_speech}</span>
                    <div className="flex items-start gap-1">
                      <span className="text-sm text-foreground/80 italic">{current.example}</span>
                      <SpeakButton text={current.example} gender={voiceGender} className="shrink-0 -mt-1" />
                    </div>
                    <span className="text-xs text-muted-foreground italic mt-1">{current.example_translation}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={current.id} className="card-enter rounded-2xl border border-border bg-card shadow-sm p-6 mb-4 text-center min-h-64 flex flex-col justify-center">
                {current.deckName && (
                  <span className="text-[11px] text-muted-foreground mb-2">{current.deckName}</span>
                )}
                {current.tier && (
                  <Badge variant="outline" className={`mx-auto mb-4 ${TIER_CLASSES[current.tier] || ''}`}>
                    {current.tier}
                  </Badge>
                )}

                {mode === 'listen' ? (
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
                    <span className="text-xs text-muted-foreground">Listen, then type what you heard</span>
                  </div>
                ) : mode === 'cloze' && cloze ? (
                  <>
                    <p className="text-base text-foreground mb-1">
                      {cloze.before}
                      <span className="inline-block min-w-16 border-b-2 border-primary/40 align-bottom">&nbsp;</span>
                      {cloze.after}
                    </p>
                    <span className={`text-xs text-muted-foreground italic ${clozeHint ? 'mb-1' : 'mb-4'}`}>{current.example_translation}</span>
                    {clozeHint && <span className="text-xs text-primary/80 mb-4">{clozeHint}</span>}
                  </>
                ) : (
                  <>
                    <span className="text-xl font-semibold text-foreground mb-1">{current.translation}</span>
                    <span className="text-xs text-muted-foreground italic mb-4">{current.part_of_speech}</span>
                  </>
                )}

                {!checked ? (
                  <form onSubmit={(e) => { e.preventDefault(); checkAnswer() }} className="flex gap-2">
                    <Input
                      autoFocus
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder={mode === 'listen' ? 'Type what you heard...' : mode === 'cloze' && cloze ? 'Fill in the blank...' : 'Type the Spanish word...'}
                      className="text-center rounded-xl"
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
                      <span className="text-sm text-foreground/80 italic">{current.example}</span>
                      <SpeakButton text={current.example} gender={voiceGender} className="shrink-0 -mt-1" />
                    </div>
                    <span className="text-xs text-muted-foreground italic mt-1">{current.example_translation}</span>
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
            ) : mode === 'flip' ? (
              <Button onClick={() => setFlipped(true)} className="w-full rounded-xl">
                Show answer
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-2">Type your answer and press Enter</p>
            )}

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {index + 1} / {cards.length}
              {mode === 'flip' && <span className="hidden sm:inline"> · space to flip · 1&ndash;4 to rate</span>}
              {mode !== 'flip' && checked && <span className="hidden sm:inline"> · 1&ndash;4 to rate</span>}
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
